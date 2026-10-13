//! `/api/system`: facts about the running server the UI uses to explain
//! settings (e.g. which folder "automatic" means for the work folder).

use axum::Json;
use axum::extract::State;
use popcorn_batch_core::SystemInfo;

use crate::services::hardware::in_container;
use crate::state::AppState;

/// The variables that may hold the image's build label, in the order they
/// are read: `POPCORN_BATCH_VERSION`, then its names under the project's
/// earlier names, Szalinski and Chrysopoeia.
pub const VERSION_VARIABLES: [&str; 3] = [
    "POPCORN_BATCH_VERSION",
    "SZALINSKI_VERSION",
    "CHRYSOPOEIA_VERSION",
];

/// The image build label from `POPCORN_BATCH_VERSION` (e.g. `edge-1a2b3c4`),
/// or one of the older [`VERSION_VARIABLES`], when it is set and differs
/// from the version.
pub fn build_label() -> Option<String> {
    build_label_from(version_variable(|name| std::env::var(name).ok()))
}

/// The value of the first of [`VERSION_VARIABLES`] that `get` finds set and
/// not empty.
fn version_variable(get: impl Fn(&str) -> Option<String>) -> Option<String> {
    VERSION_VARIABLES
        .iter()
        .find_map(|name| get(name).filter(|v| !v.trim().is_empty()))
}

fn build_label_from(value: Option<String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty() && v != env!("CARGO_PKG_VERSION"))
}

/// `GET /api/system`
pub async fn get(State(state): State<AppState>) -> Json<SystemInfo> {
    let config = &state.config;
    Json(SystemInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        build: build_label(),
        default_temp_dir: config.temp_dir.as_ref().map(|d| d.display().to_string()),
        browse_roots: config
            .browse_roots
            .iter()
            .map(|r| r.display().to_string())
            .collect(),
        data_dir: std::path::absolute(&config.data_dir)
            .unwrap_or_else(|_| config.data_dir.clone())
            .display()
            .to_string(),
        in_container: in_container(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn build_labels_differ_from_the_version() {
        assert_eq!(
            build_label_from(Some(" edge-1a2b3c4 ".into())).as_deref(),
            Some("edge-1a2b3c4")
        );
        assert_eq!(build_label_from(Some(String::new())), None);
        assert_eq!(build_label_from(None), None);
        assert_eq!(
            build_label_from(Some(env!("CARGO_PKG_VERSION").into())),
            None
        );
    }

    /// `POPCORN_BATCH_VERSION` first, then the names it had under Szalinski
    /// and Chrysopoeia; an empty value counts as unset.
    #[test]
    fn the_version_variable_falls_back_to_the_earlier_names() {
        fn env<'a>(vars: &'a [(&'a str, &'a str)]) -> impl Fn(&str) -> Option<String> + 'a {
            move |name| {
                vars.iter()
                    .find(|(n, _)| *n == name)
                    .map(|(_, v)| (*v).to_string())
            }
        }
        let all = [
            ("POPCORN_BATCH_VERSION", "1.0.0"),
            ("SZALINSKI_VERSION", "0.3.0"),
            ("CHRYSOPOEIA_VERSION", "0.2.0"),
        ];
        assert_eq!(version_variable(env(&all)).as_deref(), Some("1.0.0"));
        assert_eq!(
            version_variable(env(&[
                ("POPCORN_BATCH_VERSION", ""),
                ("SZALINSKI_VERSION", "edge-1a2b3c4"),
                ("CHRYSOPOEIA_VERSION", "0.2.0"),
            ]))
            .as_deref(),
            Some("edge-1a2b3c4")
        );
        assert_eq!(
            version_variable(env(&[("CHRYSOPOEIA_VERSION", "main-7654321")])).as_deref(),
            Some("main-7654321")
        );
        assert_eq!(version_variable(env(&[])), None);
    }
}
