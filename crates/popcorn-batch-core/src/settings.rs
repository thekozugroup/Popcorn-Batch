//! Global settings, persisted by the server and edited in the UI.

use serde::{Deserialize, Serialize};

use crate::hardware::HwPreference;
use crate::profile::TranscodeProfile;

/// Where finished files go.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OutputMode {
    /// Replace the original file once the new one passes verification.
    Replace,
    /// Write into `output_folder`, mirroring the library's folder structure,
    /// and leave originals untouched.
    Folder,
}

/// A setting that names a folder Popcorn Batch writes into.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FolderSetting {
    /// `Settings::output_folder` (used in folder mode).
    OutputFolder,
    /// `Settings::temp_dir`, or the work folder Popcorn Batch was started
    /// with while that is unset.
    TempDir,
}

/// Whether the drives and shares a folder in use sits on are connected as
/// they were (`GET /api/settings/folders`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FolderStatus {
    pub setting: FolderSetting,
    /// The folder in use.
    pub path: String,
    /// Why it can't be used now ("The drive or share mounted at … isn't
    /// connected. …", "A different drive is mounted at … than before. …"),
    /// `None` when it can.
    pub problem: Option<String>,
    /// Set (with `problem`) when another drive is mounted where its drive
    /// was: that place. `POST /api/settings/relearn-mounts` takes the drive
    /// there now as the usual one.
    pub changed_mount: Option<String>,
}

/// How hard to check each finished file before it replaces the original.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ValidationLevel {
    /// No checks. Not recommended.
    Off,
    /// Container, stream and duration checks only.
    Quick,
    /// Quick + full decode of the output + visual comparison at 4 points.
    Standard,
    /// Standard + visual comparison at 10 points + black/frozen frame checks.
    Thorough,
}

/// Daily window during which new jobs may start (local time, 24h clock).
/// `start == end` means all day. `start > end` wraps past midnight.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ActiveHours {
    pub start: u8,
    pub end: u8,
}

impl ActiveHours {
    pub fn contains(self, hour: u8) -> bool {
        let (s, e, h) = (self.start % 24, self.end % 24, hour % 24);
        if s == e {
            true
        } else if s < e {
            h >= s && h < e
        } else {
            h >= s || h < e
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    /// Queue files that need work automatically after each scan.
    pub auto_queue: bool,
    /// Pick up new and changed files as they appear.
    pub watch_folders: bool,
    /// Full rescan interval in hours. 0 disables periodic rescans.
    pub rescan_interval_hours: u32,
    /// Concurrent jobs. `None` = automatic, based on detected hardware.
    pub max_jobs: Option<u32>,
    pub hardware: HwPreference,
    /// If a hardware encode fails, retry on the CPU.
    pub cpu_fallback: bool,
    pub validation: ValidationLevel,
    pub output_mode: OutputMode,
    /// Required when `output_mode` is `Folder`.
    pub output_folder: Option<String>,
    /// Scratch space for in-progress encodes. `None` writes next to the source.
    pub temp_dir: Option<String>,
    /// Copy the original's modification time onto the new file, so media
    /// servers don't list it as newly added.
    pub keep_file_dates: bool,
    /// Run ffmpeg at reduced CPU priority.
    pub low_priority: bool,
    /// Only start new jobs inside this window. `None` = any time.
    pub active_hours: Option<ActiveHours>,
    /// Glob patterns (relative to a library root) to ignore, e.g. `**/Extras/**`.
    pub ignore_patterns: Vec<String>,
    /// Ignore files smaller than this many megabytes (samples, trailers).
    pub min_file_size_mb: u32,
    /// Profile given to newly added libraries.
    pub default_profile: TranscodeProfile,
    /// Set once the first-run setup has been completed or dismissed.
    pub onboarded: bool,
    /// Where the Popcorn SR manager is reached on the user's network, as
    /// `http://` or `https://` (checked on save). Optional; `None` = not
    /// given. Only the web UI uses it, to link to Popcorn SR: the server
    /// never contacts it.
    #[serde(default)]
    pub popcorn_sr_url: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            auto_queue: true,
            watch_folders: true,
            rescan_interval_hours: 12,
            max_jobs: None,
            hardware: HwPreference::Auto,
            cpu_fallback: true,
            validation: ValidationLevel::Standard,
            output_mode: OutputMode::Replace,
            output_folder: None,
            temp_dir: None,
            keep_file_dates: true,
            low_priority: true,
            active_hours: None,
            ignore_patterns: vec![
                "**/.*".into(),
                "**/@eaDir/**".into(),
                "**/#recycle/**".into(),
                "**/*.partial~".into(),
            ],
            min_file_size_mb: 0,
            default_profile: TranscodeProfile::default(),
            onboarded: false,
            popcorn_sr_url: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn active_hours_wrap_midnight() {
        let night = ActiveHours { start: 22, end: 6 };
        assert!(night.contains(23));
        assert!(night.contains(2));
        assert!(!night.contains(12));
        let all = ActiveHours { start: 0, end: 0 };
        assert!(all.contains(15));
    }

    #[test]
    fn partial_json_fills_defaults() {
        let s: Settings = serde_json::from_str(r#"{"max_jobs":3}"#).unwrap();
        assert_eq!(s.max_jobs, Some(3));
        assert!(s.auto_queue);
        assert_eq!(s.validation, ValidationLevel::Standard);
    }

    #[test]
    fn popcorn_sr_url_is_unset_by_default() {
        assert_eq!(Settings::default().popcorn_sr_url, None);
        let json = serde_json::to_value(Settings::default()).unwrap();
        assert!(json["popcorn_sr_url"].is_null(), "{json}");
    }

    #[test]
    fn settings_saved_before_popcorn_sr_url_existed_still_load() {
        // What an older database holds: every key but `popcorn_sr_url`.
        let mut old = serde_json::to_value(Settings::default()).unwrap();
        old.as_object_mut().unwrap().remove("popcorn_sr_url");
        assert!(old.get("popcorn_sr_url").is_none());
        let s: Settings = serde_json::from_value(old).unwrap();
        assert_eq!(s, Settings::default());
    }

    #[test]
    fn popcorn_sr_url_round_trips_through_json() {
        let s = Settings {
            popcorn_sr_url: Some("http://tower:8787".into()),
            ..Settings::default()
        };
        let back: Settings = serde_json::from_str(&serde_json::to_string(&s).unwrap()).unwrap();
        assert_eq!(back.popcorn_sr_url.as_deref(), Some("http://tower:8787"));
        let cleared: Settings = serde_json::from_str(r#"{"popcorn_sr_url":null}"#).unwrap();
        assert_eq!(cleared.popcorn_sr_url, None);
    }
}
