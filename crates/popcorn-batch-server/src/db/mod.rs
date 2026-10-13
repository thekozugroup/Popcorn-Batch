//! SQLite storage (WAL mode) for settings, libraries, files, jobs, activity
//! and daily savings.
//!
//! All queries are runtime queries. Timestamps are stored as RFC 3339 UTC
//! strings with millisecond precision (so they sort as text) and UUIDs as
//! hyphenated lowercase strings. Write transactions start with
//! `BEGIN IMMEDIATE` so concurrent writers wait on the busy timeout instead of
//! failing on a lock upgrade.

pub mod activity;
pub mod files;
pub mod folder_mounts;
pub mod jobs;
pub mod libraries;
pub mod migrate;
pub mod settings;
pub mod stats;

use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::Context;
use chrono::{DateTime, SecondsFormat, Utc};
use popcorn_batch_core::ProblemKind;
use serde::Serialize;
use serde::de::DeserializeOwned;
use sqlx::sqlite::{
    SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteRow, SqliteSynchronous,
};
use sqlx::{Connection, Row, Sqlite, SqlitePool, Transaction};
use uuid::Uuid;

/// Name of the database file inside the data directory.
pub const DB_FILE_NAME: &str = "popcorn-batch.db";

/// The database file's names under the project's earlier names, newest
/// first, each with the name the project had then: Szalinski (0.3) and
/// Chrysopoeia (0.2).
pub const LEGACY_DB_FILE_NAMES: [(&str, &str); 2] = [
    ("szalinski.db", "Szalinski"),
    ("chrysopoeia.db", "Chrysopoeia"),
];

/// The files SQLite keeps next to a database while it is in use.
const DB_LOG_SUFFIXES: [&str; 3] = ["-wal", "-shm", "-journal"];

/// After a rename of the project: a data folder without [`DB_FILE_NAME`]
/// adopts the newest older database it holds (the first of
/// [`LEGACY_DB_FILE_NAMES`] that is there), which is renamed with its log
/// files to [`DB_FILE_NAME`], so settings, libraries and history carry
/// over. Runs with the data folder locked (the older names' locks too) and
/// before the database is opened. A folder that already has the new file
/// is left as it is, and so is every older database that is not adopted.
/// Returns the file that was adopted.
pub fn adopt_legacy_database(data_dir: &Path) -> anyhow::Result<Option<PathBuf>> {
    let new = data_dir.join(DB_FILE_NAME);
    if exists_in_data_dir(&new)? {
        return Ok(None);
    }
    for (legacy, project) in LEGACY_DB_FILE_NAMES {
        let old = data_dir.join(legacy);
        if !exists_in_data_dir(&old)? {
            continue;
        }
        // The log files first: a database renamed without its write-ahead
        // log would lose the changes not yet folded into it. A start
        // interrupted half way finishes the job the next time, since the
        // database still has its older name.
        for suffix in DB_LOG_SUFFIXES {
            let from = data_dir.join(format!("{legacy}{suffix}"));
            if exists_in_data_dir(&from)? {
                let to = data_dir.join(format!("{DB_FILE_NAME}{suffix}"));
                std::fs::rename(&from, &to).with_context(|| {
                    format!("Could not rename {} to {}", from.display(), to.display())
                })?;
            }
        }
        std::fs::rename(&old, &new)
            .with_context(|| format!("Could not rename {} to {}", old.display(), new.display()))?;
        if let Ok(dir) = std::fs::File::open(data_dir) {
            let _ = dir.sync_all();
        }
        tracing::info!(
            "carried over the database of {project} (an earlier name of Popcorn Batch): {} is \
             now {}",
            old.display(),
            new.display()
        );
        return Ok(Some(old));
    }
    Ok(None)
}

/// Whether `path` exists. Only "not found" is no: a folder that answers
/// with another error must never have a database put in place over one it
/// could not see.
fn exists_in_data_dir(path: &Path) -> anyhow::Result<bool> {
    path.try_exists()
        .with_context(|| format!("Could not check for {} in the data folder", path.display()))
}

/// A write transaction.
pub type Tx = Transaction<'static, Sqlite>;

/// How long a writer waits for another writer before giving up. Generous,
/// because Unraid appdata often lives on spinning disks; long operations
/// commit in chunks so no single write holds the lock for anywhere near this.
pub const DEFAULT_BUSY_TIMEOUT: Duration = Duration::from_secs(30);

/// Connection pool plus helpers.
#[derive(Debug, Clone)]
pub struct Db {
    pool: SqlitePool,
}

impl Db {
    /// Open (creating if needed) the database at `path` and run migrations.
    pub async fn open(path: &Path) -> anyhow::Result<Self> {
        Self::open_with(path, DEFAULT_BUSY_TIMEOUT).await
    }

    /// [`Db::open`] with a specific busy timeout (tests shorten it).
    pub async fn open_with(path: &Path, busy_timeout: Duration) -> anyhow::Result<Self> {
        let options = SqliteConnectOptions::new()
            .filename(path)
            .create_if_missing(true)
            .journal_mode(SqliteJournalMode::Wal)
            .synchronous(SqliteSynchronous::Normal)
            .foreign_keys(true)
            .busy_timeout(busy_timeout);
        let pool = match pool_options(busy_timeout).connect_with(options).await {
            Ok(pool) => pool,
            Err(e) => {
                let e = anyhow::Error::new(e);
                if is_damaged(&e) {
                    return Err(damaged(path, &e));
                }
                if is_disk_full(path, &e).await {
                    return Err(e.context(disk_full_message(path)));
                }
                return Err(e.context(format!(
                    "Could not open the database at {}. Check that the data folder is writable \
                     (in Docker: the /config volume and PUID/PGID)",
                    path.display()
                )));
            }
        };
        if let Err(e) = migrate::migrate(&pool).await {
            pool.close().await;
            if is_damaged(&e) {
                return Err(damaged(path, &e));
            }
            if is_disk_full(path, &e).await {
                return Err(e.context(disk_full_message(path)));
            }
            return Err(e);
        }
        Ok(Self { pool })
    }

    /// The underlying pool, for reads and single-statement writes.
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Begin a write transaction (`BEGIN IMMEDIATE`).
    ///
    /// sqlx refuses a `BEGIN` on a connection it still counts as inside a
    /// transaction. The pool never hands such a connection out (see
    /// [`pool_options`]); should one slip through anyway, it is dropped
    /// (and closed) and another one is used.
    pub async fn write_tx(&self) -> sqlx::Result<Tx> {
        let mut attempts = 0;
        loop {
            match self.pool.begin_with("BEGIN IMMEDIATE").await {
                Err(sqlx::Error::InvalidSavePointStatement | sqlx::Error::BeginFailed)
                    if attempts < 3 =>
                {
                    attempts += 1;
                    tracing::warn!("a database connection was left in a bad state; using another");
                }
                result => return result,
            }
        }
    }

    /// Close every connection (checkpointing the WAL).
    pub async fn close(&self) {
        self.pool.close().await;
    }
}

/// Pool settings. A connection whose transaction ended badly is closed
/// instead of being reused: when a write fails because the disk is full (or
/// on an I/O error), SQLite rolls the transaction back by itself, so the
/// `COMMIT` and the `ROLLBACK` sqlx sends afterwards both fail and sqlx keeps
/// counting the connection as inside a transaction. Every later `BEGIN` on
/// it would fail, long after the disk has room again.
fn pool_options(busy_timeout: Duration) -> SqlitePoolOptions {
    SqlitePoolOptions::new()
        .max_connections(8)
        .min_connections(1)
        .acquire_timeout(busy_timeout.max(Duration::from_secs(30)))
        .after_release(|conn, _meta| {
            Box::pin(async move {
                // The ping is handled after the rollback a dropped
                // transaction queued, so the depth read next is final.
                conn.ping().await?;
                Ok(!conn.is_in_transaction())
            })
        })
        .before_acquire(|conn, _meta| Box::pin(async move { Ok(!conn.is_in_transaction()) }))
}

/// The database file is damaged: SQLite finds it malformed, or not a
/// database at all. Start-up moves it aside and begins a new one.
#[derive(Debug, thiserror::Error)]
#[error("The database at {} is damaged ({detail})", path.display())]
pub struct DamagedDatabase {
    /// The damaged file.
    pub path: PathBuf,
    /// SQLite's description, for the log.
    pub detail: String,
}

fn damaged(path: &Path, e: &anyhow::Error) -> anyhow::Error {
    let detail = e
        .chain()
        .find_map(|c| c.downcast_ref::<sqlx::Error>())
        .map_or_else(|| format!("{e:#}"), ToString::to_string);
    anyhow::Error::new(DamagedDatabase {
        path: path.to_path_buf(),
        detail,
    })
}

/// Free space below which the disk holding the database counts as full
/// when SQLite fails (it needs room for its write-ahead log and index).
const FULL_DISK_BYTES: u64 = 1024 * 1024;

/// What to tell the user when the database can't be opened or written
/// because its disk is full.
pub fn disk_full_message(path: &Path) -> String {
    let folder = path.parent().unwrap_or(path);
    format!(
        "The disk that holds the data folder ({}) is full, so the database there couldn't be \
         opened. Free some space on that disk, then start Popcorn Batch again",
        folder.display()
    )
}

/// Whether a database error comes from a full disk: SQLite says so
/// (`SQLITE_FULL`, or the system's "no space left"), or SQLite failed (a
/// new database can fail with a disk I/O error instead) while the disk
/// holding `path` has almost no free space left.
pub async fn is_disk_full(path: &Path, e: &anyhow::Error) -> bool {
    let full_code = e
        .chain()
        .filter_map(|c| c.downcast_ref::<sqlx::Error>())
        .any(|e| match e {
            sqlx::Error::Database(d) => sqlite_code(d.code().as_deref()) == Some(13),
            sqlx::Error::Io(io) => is_no_space(io),
            _ => false,
        });
    let io_full = e
        .chain()
        .filter_map(|c| c.downcast_ref::<std::io::Error>())
        .any(is_no_space);
    if full_code || io_full {
        return true;
    }
    let dir = path.parent().unwrap_or(path).to_path_buf();
    tokio::task::spawn_blocking(move || free_bytes(&dir))
        .await
        .ok()
        .flatten()
        .is_some_and(|free| free < FULL_DISK_BYTES)
}

/// SQLite's primary result code from an extended one.
fn sqlite_code(code: Option<&str>) -> Option<i32> {
    code.and_then(|c| c.parse::<i32>().ok()).map(|c| c & 0xff)
}

fn is_no_space(e: &std::io::Error) -> bool {
    e.kind() == std::io::ErrorKind::StorageFull || e.raw_os_error() == Some(28)
}

/// Bytes an unprivileged user may still write on the disk holding `dir`
/// (or its nearest existing parent). `None` when unknown.
#[cfg(unix)]
fn free_bytes(dir: &Path) -> Option<u64> {
    let existing = dir.ancestors().find(|d| d.exists())?;
    let stat = rustix::fs::statvfs(existing).ok()?;
    Some(stat.f_bavail.saturating_mul(stat.f_frsize))
}

#[cfg(not(unix))]
fn free_bytes(_dir: &Path) -> Option<u64> {
    None
}

/// Whether an error says the database file itself is damaged
/// (`SQLITE_CORRUPT` or `SQLITE_NOTADB`), not unreadable or busy.
pub fn is_damaged(e: &anyhow::Error) -> bool {
    e.chain()
        .filter_map(|c| c.downcast_ref::<sqlx::Error>())
        .any(|e| match e {
            sqlx::Error::Database(d) => d
                .code()
                .and_then(|c| c.parse::<i32>().ok())
                .is_some_and(|c| matches!(c & 0xff, 11 | 26)),
            _ => false,
        })
}

/// Move a damaged database file (and its WAL and shared-memory files) aside
/// as `<name>.damaged-<UTC time>`, so a new database can be started. Returns
/// where the database file went.
pub fn move_damaged_aside(path: &Path) -> anyhow::Result<PathBuf> {
    let name = path.file_name().map_or_else(
        || DB_FILE_NAME.to_string(),
        |n| n.to_string_lossy().into_owned(),
    );
    let aside_name = format!("{name}.damaged-{}", Utc::now().format("%Y%m%d-%H%M%S"));
    let aside = path.with_file_name(&aside_name);
    std::fs::rename(path, &aside).with_context(|| {
        format!(
            "The database at {} is damaged and could not be moved aside. Stop Popcorn Batch, \
             rename or delete that file (your media files are not affected by this), and start \
             it again",
            path.display()
        )
    })?;
    for suffix in ["-wal", "-shm"] {
        let side = path.with_file_name(format!("{name}{suffix}"));
        if side.exists() {
            let to = path.with_file_name(format!("{aside_name}{suffix}"));
            if let Err(e) = std::fs::rename(&side, &to) {
                tracing::warn!("could not move {} aside: {e}", side.display());
                let _ = std::fs::remove_file(&side);
            }
        }
    }
    Ok(aside)
}

/// Format a timestamp for storage.
pub fn ts(at: DateTime<Utc>) -> String {
    at.to_rfc3339_opts(SecondsFormat::Millis, true)
}

/// The current time, formatted for storage.
pub fn now_ts() -> String {
    ts(Utc::now())
}

/// A decode error for values that don't parse.
pub fn decode_error(message: impl Into<String>) -> sqlx::Error {
    sqlx::Error::Decode(message.into().into())
}

/// Parse a stored timestamp.
pub fn parse_ts(value: &str) -> sqlx::Result<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .map(|d| d.with_timezone(&Utc))
        .map_err(|e| decode_error(format!("bad timestamp {value:?}: {e}")))
}

/// Serialize a unit enum to its serde name (e.g. `JobState::Queued` → `queued`).
pub fn enum_str<T: Serialize>(value: &T) -> String {
    match serde_json::to_value(value) {
        Ok(serde_json::Value::String(s)) => s,
        _ => String::new(),
    }
}

/// Parse a unit enum from its serde name.
pub fn parse_enum<T: DeserializeOwned>(value: &str) -> sqlx::Result<T> {
    serde_json::from_value(serde_json::Value::String(value.to_string()))
        .map_err(|e| decode_error(format!("bad enum value {value:?}: {e}")))
}

/// The kind of problem behind a stored `error`: the stored `problem` when
/// there is an error (`other` when a row has none or one this version
/// doesn't know), and none without an error, so the two always go together.
pub fn problem_of(error: Option<&str>, problem: Option<&str>) -> Option<ProblemKind> {
    error?;
    Some(
        problem
            .and_then(|p| parse_enum::<ProblemKind>(p).ok())
            .unwrap_or(ProblemKind::Other),
    )
}

/// Parse a JSON column.
pub fn parse_json<T: DeserializeOwned>(value: &str) -> sqlx::Result<T> {
    serde_json::from_str(value).map_err(|e| decode_error(format!("bad JSON column: {e}")))
}

/// Serialize a value for a JSON column.
pub fn to_json<T: Serialize>(value: &T) -> sqlx::Result<String> {
    serde_json::to_string(value).map_err(|e| sqlx::Error::Encode(Box::new(e)))
}

/// Read a UUID column.
pub fn uuid_col(row: &SqliteRow, column: &str) -> sqlx::Result<Uuid> {
    let s: String = row.try_get(column)?;
    Uuid::parse_str(&s).map_err(|e| decode_error(format!("bad id {s:?}: {e}")))
}

/// Read a nullable UUID column.
pub fn opt_uuid_col(row: &SqliteRow, column: &str) -> sqlx::Result<Option<Uuid>> {
    let s: Option<String> = row.try_get(column)?;
    s.map(|s| Uuid::parse_str(&s).map_err(|e| decode_error(format!("bad id {s:?}: {e}"))))
        .transpose()
}

/// Read a timestamp column.
pub fn ts_col(row: &SqliteRow, column: &str) -> sqlx::Result<DateTime<Utc>> {
    let s: String = row.try_get(column)?;
    parse_ts(&s)
}

/// Read a nullable timestamp column.
pub fn opt_ts_col(row: &SqliteRow, column: &str) -> sqlx::Result<Option<DateTime<Utc>>> {
    let s: Option<String> = row.try_get(column)?;
    s.as_deref().map(parse_ts).transpose()
}

/// Read a non-negative integer column as `u64`.
pub fn u64_col(row: &SqliteRow, column: &str) -> sqlx::Result<u64> {
    let v: i64 = row.try_get(column)?;
    Ok(u64::try_from(v).unwrap_or(0))
}

/// Read a nullable non-negative integer column as `u64`.
pub fn opt_u64_col(row: &SqliteRow, column: &str) -> sqlx::Result<Option<u64>> {
    let v: Option<i64> = row.try_get(column)?;
    Ok(v.map(|v| u64::try_from(v).unwrap_or(0)))
}

/// Whether a database error is temporary (another writer holds the lock, a
/// full disk or an I/O hiccup), so the operation is worth retrying.
pub fn is_transient(e: &sqlx::Error) -> bool {
    match e {
        sqlx::Error::PoolTimedOut | sqlx::Error::Io(_) => true,
        sqlx::Error::Database(d) => d
            .code()
            .and_then(|c| c.parse::<i32>().ok())
            // Primary result codes: BUSY, LOCKED, IOERR, FULL.
            .is_some_and(|c| matches!(c & 0xff, 5 | 6 | 10 | 13)),
        _ => false,
    }
}

/// Convert a byte count for storage.
pub fn i64_of(v: u64) -> i64 {
    i64::try_from(v).unwrap_or(i64::MAX)
}

/// Escape `%`, `_` and `\` for a `LIKE ... ESCAPE '\'` pattern.
pub fn like_escape(value: &str) -> String {
    let mut out = String::with_capacity(value.len() + 2);
    for c in value.chars() {
        if matches!(c, '%' | '_' | '\\') {
            out.push('\\');
        }
        out.push(c);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use popcorn_batch_core::JobState;

    /// The names of the files in `dir`, sorted, with their contents.
    fn folder(dir: &Path) -> Vec<(String, String)> {
        let mut found: Vec<_> = std::fs::read_dir(dir)
            .unwrap()
            .map(|e| {
                let e = e.unwrap();
                let name = e.file_name().to_string_lossy().into_owned();
                (name, std::fs::read_to_string(e.path()).unwrap())
            })
            .collect();
        found.sort();
        found
    }

    fn put(dir: &Path, files: &[&str]) {
        for name in files {
            std::fs::write(dir.join(name), name).unwrap();
        }
    }

    fn pairs(files: &[(&str, &str)]) -> Vec<(String, String)> {
        files
            .iter()
            .map(|(a, b)| (a.to_string(), b.to_string()))
            .collect()
    }

    #[test]
    fn the_database_of_an_earlier_name_is_adopted_with_its_log_files() {
        assert_eq!(
            LEGACY_DB_FILE_NAMES.map(|(file, _)| file),
            ["szalinski.db", "chrysopoeia.db"]
        );
        for legacy in ["szalinski", "chrysopoeia"] {
            let dir = tempfile::tempdir().unwrap();
            let files = ["", "-wal", "-shm", "-journal"].map(|s| format!("{legacy}.db{s}"));
            put(dir.path(), &files.each_ref().map(String::as_str));
            put(dir.path(), &["notes.txt"]);
            assert_eq!(
                adopt_legacy_database(dir.path()).unwrap(),
                Some(dir.path().join(format!("{legacy}.db")))
            );
            let db = format!("{legacy}.db");
            let (wal, shm, journal) = (
                format!("{legacy}.db-wal"),
                format!("{legacy}.db-shm"),
                format!("{legacy}.db-journal"),
            );
            assert_eq!(
                folder(dir.path()),
                pairs(&[
                    ("notes.txt", "notes.txt"),
                    ("popcorn-batch.db", &db),
                    ("popcorn-batch.db-journal", &journal),
                    ("popcorn-batch.db-shm", &shm),
                    ("popcorn-batch.db-wal", &wal),
                ]),
                "{legacy}"
            );
            // Once is enough.
            assert_eq!(adopt_legacy_database(dir.path()).unwrap(), None);
        }
    }

    /// Szalinski's database is newer than Chrysopoeia's: with both there,
    /// it is the one adopted, and Chrysopoeia's is left as it is.
    #[test]
    fn the_newest_earlier_database_is_adopted_and_the_others_left_alone() {
        let dir = tempfile::tempdir().unwrap();
        put(
            dir.path(),
            &["chrysopoeia.db", "chrysopoeia.db-wal", "szalinski.db"],
        );
        assert_eq!(
            adopt_legacy_database(dir.path()).unwrap(),
            Some(dir.path().join("szalinski.db"))
        );
        assert_eq!(
            folder(dir.path()),
            pairs(&[
                ("chrysopoeia.db", "chrysopoeia.db"),
                ("chrysopoeia.db-wal", "chrysopoeia.db-wal"),
                ("popcorn-batch.db", "szalinski.db"),
            ])
        );
    }

    /// A folder that has the current database never adopts another one,
    /// whatever else it holds.
    #[test]
    fn nothing_is_adopted_next_to_the_current_database() {
        let dir = tempfile::tempdir().unwrap();
        let all = [
            "popcorn-batch.db",
            "szalinski.db",
            "szalinski.db-wal",
            "chrysopoeia.db",
            "chrysopoeia.db-wal",
        ];
        put(dir.path(), &all);
        let before = folder(dir.path());
        assert_eq!(adopt_legacy_database(dir.path()).unwrap(), None);
        assert_eq!(folder(dir.path()), before);

        // An empty folder has nothing to adopt.
        let empty = tempfile::tempdir().unwrap();
        assert_eq!(adopt_legacy_database(empty.path()).unwrap(), None);
        assert!(folder(empty.path()).is_empty());
    }

    /// A start stopped after the log files were renamed, before the
    /// database was: the next start renames the database to join them.
    #[test]
    fn an_interrupted_adoption_is_finished_by_the_next_start() {
        let dir = tempfile::tempdir().unwrap();
        put(dir.path(), &["szalinski.db"]);
        std::fs::write(dir.path().join("popcorn-batch.db-wal"), "szalinski.db-wal").unwrap();
        assert_eq!(
            adopt_legacy_database(dir.path()).unwrap(),
            Some(dir.path().join("szalinski.db"))
        );
        assert_eq!(
            folder(dir.path()),
            pairs(&[
                ("popcorn-batch.db", "szalinski.db"),
                ("popcorn-batch.db-wal", "szalinski.db-wal"),
            ])
        );
    }

    #[test]
    fn timestamps_roundtrip_and_sort() {
        let a = Utc::now();
        let s = ts(a);
        assert!(s.ends_with('Z'));
        let back = parse_ts(&s).unwrap();
        assert_eq!(back.timestamp_millis(), a.timestamp_millis());
    }

    #[test]
    fn enums_use_serde_names() {
        assert_eq!(enum_str(&JobState::Queued), "queued");
        let s: JobState = parse_enum("cancelled").unwrap();
        assert_eq!(s, JobState::Cancelled);
        assert!(parse_enum::<JobState>("nope").is_err());
    }

    #[test]
    fn like_escaping() {
        assert_eq!(like_escape("50%_off\\"), "50\\%\\_off\\\\");
    }

    /// A write that fails because the disk is full makes SQLite roll the
    /// transaction back by itself; the connection must not come back to
    /// the pool still counted as inside a transaction, or every later write
    /// fails ("begin_with at non-zero transaction depth") until a restart.
    #[tokio::test]
    async fn writes_work_again_after_the_disk_was_full() {
        let dir = tempfile::tempdir().unwrap();
        let db = Db::open(&dir.path().join("t.db")).await.unwrap();
        sqlx::query("CREATE TABLE big (x BLOB)")
            .execute(db.pool())
            .await
            .unwrap();
        for _ in 0..3 {
            let mut tx = db.write_tx().await.unwrap();
            // This connection may not grow the file: the disk is "full".
            let pages: i64 = sqlx::query_scalar("PRAGMA page_count")
                .fetch_one(&mut *tx)
                .await
                .unwrap();
            sqlx::query(&format!("PRAGMA max_page_count = {pages}"))
                .execute(&mut *tx)
                .await
                .unwrap();
            let full = sqlx::query("INSERT INTO big VALUES (zeroblob(200000))")
                .execute(&mut *tx)
                .await
                .unwrap_err();
            assert!(is_transient(&full), "{full}");
            // SQLite already rolled back, so the commit fails too.
            assert!(tx.commit().await.is_err());
            // Let the pool take the connection back.
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        // The disk has room again: every write works.
        for i in 0..20 {
            let mut tx = db
                .write_tx()
                .await
                .unwrap_or_else(|e| panic!("write {i} could not start: {e}"));
            sqlx::query("INSERT INTO big VALUES (zeroblob(10))")
                .execute(&mut *tx)
                .await
                .unwrap();
            tx.commit().await.unwrap();
        }
        let rows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM big")
            .fetch_one(db.pool())
            .await
            .unwrap();
        assert_eq!(rows, 20);
    }

    #[tokio::test]
    async fn a_damaged_database_is_recognised_and_moved_aside() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join(DB_FILE_NAME);
        {
            let db = Db::open(&path).await.unwrap();
            db.close().await;
        }
        // Garble the header: SQLite no longer sees a database there.
        let mut bytes = std::fs::read(&path).unwrap();
        bytes[..16].copy_from_slice(b"not a database!!");
        std::fs::write(&path, &bytes).unwrap();
        std::fs::write(dir.path().join(format!("{DB_FILE_NAME}-wal")), b"junk").unwrap();

        let err = Db::open(&path).await.unwrap_err();
        assert!(err.downcast_ref::<DamagedDatabase>().is_some(), "{err:#}");
        let aside = move_damaged_aside(&path).unwrap();
        assert!(!path.exists());
        assert!(aside.exists());
        assert!(
            aside
                .file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("popcorn-batch.db.damaged-")
        );
        assert!(!dir.path().join(format!("{DB_FILE_NAME}-wal")).exists());
        // A new database starts where the damaged one was.
        Db::open(&path).await.unwrap();

        // A folder that can't be written is not "damaged".
        let missing = dir.path().join("no/such/folder/t.db");
        let err = Db::open(&missing).await.unwrap_err();
        assert!(err.downcast_ref::<DamagedDatabase>().is_none());
        assert!(format!("{err:#}").contains("Check that the data folder is writable"));
        assert!(!format!("{err:#}").contains("full"));
    }

    /// A data folder on a full disk is reported as a full disk (not as a
    /// folder that can't be written), for a new database and for one that
    /// exists. Needs permission to mount a small tmpfs; skipped otherwise.
    #[cfg(unix)]
    #[tokio::test]
    async fn a_full_disk_is_named_as_the_reason_the_database_wont_open() {
        struct Mounted(PathBuf);
        impl Drop for Mounted {
            fn drop(&mut self) {
                let _ = std::process::Command::new("umount")
                    .arg("-l")
                    .arg(&self.0)
                    .status();
            }
        }
        let dir = tempfile::tempdir().unwrap();
        let disk = dir.path().join("disk");
        std::fs::create_dir(&disk).unwrap();
        let mounted = std::process::Command::new("mount")
            .args(["-t", "tmpfs", "-o", "size=4m", "popcorn-batch-test"])
            .arg(&disk)
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .is_ok_and(|s| s.success());
        if !mounted {
            eprintln!("skipping: mounting a tmpfs is not permitted here");
            return;
        }
        let _mounted = Mounted(disk.clone());

        // A database made while there was room.
        let existing = disk.join("old.db");
        Db::open(&existing).await.unwrap().close().await;
        // Fill the disk.
        let filler = disk.join("filler");
        {
            use std::io::Write as _;
            let mut f = std::fs::File::create(&filler).unwrap();
            while f.write_all(&[0u8; 64 * 1024]).is_ok() {}
            while f.write_all(&[0u8; 512]).is_ok() {}
        }
        for path in [disk.join(DB_FILE_NAME), existing.clone()] {
            let err = Db::open(&path).await.unwrap_err();
            let text = format!("{err:#}");
            assert!(
                text.starts_with(&format!(
                    "The disk that holds the data folder ({}) is full",
                    disk.display()
                )),
                "{text}"
            );
            assert!(!text.contains("writable"), "{text}");
        }
        // Room again: it opens.
        std::fs::remove_file(&filler).unwrap();
        Db::open(&existing).await.unwrap().close().await;
    }
}
