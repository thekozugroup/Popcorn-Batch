//! Naming of the temporary and backup files Popcorn Batch writes.
//!
//! Every such file contains [`ARTIFACT_MARKER`] so the scanner can ignore it
//! and the server can clean up after a crash. Files made under the project's
//! earlier names, Szalinski and Chrysopoeia, carry one of the
//! [`LEGACY_ARTIFACT_MARKERS`] instead; they are recognised the same way, so
//! an upgrade never loses track of a backup.

use uuid::Uuid;

/// Present in the name of every temporary or backup file we create.
pub const ARTIFACT_MARKER: &str = ".popcorn-batch-";

/// The markers of files made under the project's earlier names, newest
/// first: Szalinski (0.3) and Chrysopoeia (0.2).
pub const LEGACY_ARTIFACT_MARKERS: [&str; 2] = [".szalinski-", ".chrysopoeia-"];

/// Every marker a temporary or backup file of ours may carry: the current
/// one first, then the legacy ones, newest first.
pub const ARTIFACT_MARKERS: [&str; 3] = [
    ARTIFACT_MARKER,
    LEGACY_ARTIFACT_MARKERS[0],
    LEGACY_ARTIFACT_MARKERS[1],
];

/// Where the last marker (current or legacy) starts in `name`, and its length.
fn marker_at(name: &str) -> Option<(usize, usize)> {
    ARTIFACT_MARKERS
        .iter()
        .filter_map(|marker| name.rfind(marker).map(|at| (at, marker.len())))
        .max_by_key(|&(at, _)| at)
}

fn short_id(job_id: Uuid) -> String {
    job_id.simple().to_string()[..8].to_string()
}

/// Hidden in-progress output: `.{stem}.popcorn-batch-{id8}.tmp.{ext}`.
pub fn temp_file_name(stem: &str, job_id: Uuid, ext: &str) -> String {
    format!(".{stem}{ARTIFACT_MARKER}{}.tmp.{ext}", short_id(job_id))
}

/// Hidden backup of an original while it is being replaced:
/// `.{file_name}.popcorn-batch-{id8}.bak`.
pub fn backup_file_name(file_name: &str, job_id: Uuid) -> String {
    marked_backup_file_name(file_name, job_id, ARTIFACT_MARKER)
}

fn marked_backup_file_name(file_name: &str, job_id: Uuid, marker: &str) -> String {
    format!(".{file_name}{marker}{}.bak", short_id(job_id))
}

/// The names [`backup_file_name`] gave the same backup under the project's
/// earlier names (see [`LEGACY_ARTIFACT_MARKERS`]), newest first.
pub fn legacy_backup_file_names(file_name: &str, job_id: Uuid) -> [String; 2] {
    LEGACY_ARTIFACT_MARKERS.map(|marker| marked_backup_file_name(file_name, job_id, marker))
}

/// Every name job `job_id`'s backup of `file_name` may have: the current
/// one first, then the ones used under the earlier names, newest first.
pub fn backup_file_names(file_name: &str, job_id: Uuid) -> [String; 3] {
    ARTIFACT_MARKERS.map(|marker| marked_backup_file_name(file_name, job_id, marker))
}

/// Whether a file name is one of our temporary or backup files.
pub fn is_artifact(file_name: &str) -> bool {
    ARTIFACT_MARKERS
        .iter()
        .any(|marker| file_name.contains(marker))
}

/// Whether a temporary or backup file name was made by the job `job_id`
/// (its name carries the job's short id).
pub fn is_artifact_of(file_name: &str, job_id: Uuid) -> bool {
    artifact_job(file_name) == Some(short_id(job_id).as_str())
}

/// The short job id (8 hex digits) a temporary or backup file name carries.
pub fn artifact_job(file_name: &str) -> Option<&str> {
    let (at, len) = marker_at(file_name)?;
    let id = file_name.get(at + len..)?.get(..8)?;
    id.chars().all(|c| c.is_ascii_hexdigit()).then_some(id)
}

/// Whether a file name is one of our backups.
pub fn is_backup(file_name: &str) -> bool {
    is_artifact(file_name) && file_name.ends_with(".bak")
}

/// For a backup name produced by [`backup_file_name`], the original file name.
pub fn original_name_from_backup(backup_name: &str) -> Option<String> {
    let rest = backup_name.strip_prefix('.')?.strip_suffix(".bak")?;
    let (at, _) = marker_at(rest)?;
    let (name, _) = rest.split_at(at);
    (!name.is_empty()).then(|| name.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_roundtrip() {
        let id = Uuid::parse_str("0123456789abcdef0123456789abcdef").unwrap();
        let tmp = temp_file_name("Movie (2020)", id, "mkv");
        assert_eq!(tmp, ".Movie (2020).popcorn-batch-01234567.tmp.mkv");
        assert!(is_artifact(&tmp));
        assert!(!is_backup(&tmp));

        let bak = backup_file_name("Movie (2020).mkv", id);
        assert_eq!(bak, ".Movie (2020).mkv.popcorn-batch-01234567.bak");
        assert!(is_backup(&bak));
        assert_eq!(
            original_name_from_backup(&bak).as_deref(),
            Some("Movie (2020).mkv")
        );
        assert!(!is_artifact("Movie (2020).mkv"));
    }

    #[test]
    fn artifacts_name_their_job() {
        let id = Uuid::parse_str("0123456789abcdef0123456789abcdef").unwrap();
        let other = Uuid::parse_str("fedcba9876543210fedcba9876543210").unwrap();
        for name in [
            temp_file_name("Show.popcorn-batch-edition", id, "mkv"),
            backup_file_name("Movie.mkv", id),
        ] {
            assert_eq!(artifact_job(&name), Some("01234567"), "{name}");
            assert!(is_artifact_of(&name, id));
            assert!(!is_artifact_of(&name, other));
        }
        assert_eq!(artifact_job("Movie.mkv"), None);
        let legacy = legacy_backup_file_names("Movie.mkv", id);
        assert_eq!(
            legacy,
            [
                ".Movie.mkv.szalinski-01234567.bak",
                ".Movie.mkv.chrysopoeia-01234567.bak"
            ]
        );
        for name in &legacy {
            assert!(is_artifact(name) && is_backup(name) && is_artifact_of(name, id));
            assert!(!is_artifact_of(name, other));
            assert_eq!(
                original_name_from_backup(name).as_deref(),
                Some("Movie.mkv")
            );
        }
        assert_eq!(
            backup_file_names("Movie.mkv", id),
            [
                backup_file_name("Movie.mkv", id),
                legacy[0].clone(),
                legacy[1].clone()
            ]
        );
        for tmp in [
            ".Movie.szalinski-01234567.tmp.mkv",
            ".Movie.chrysopoeia-01234567.tmp.mkv",
        ] {
            assert!(is_artifact(tmp) && !is_backup(tmp) && is_artifact_of(tmp, id));
        }
        // The last marker counts, whichever name it belongs to.
        assert_eq!(
            original_name_from_backup(".Show.szalinski-edition.mkv.popcorn-batch-01234567.bak")
                .as_deref(),
            Some("Show.szalinski-edition.mkv")
        );
        assert_eq!(
            original_name_from_backup(".Show.popcorn-batch-cut.mkv.chrysopoeia-01234567.bak")
                .as_deref(),
            Some("Show.popcorn-batch-cut.mkv")
        );
        assert!(!is_artifact("Movie.szalinski.mkv"));
        assert_eq!(artifact_job(".x.popcorn-batch-zz.tmp.mkv"), None);
    }
}
