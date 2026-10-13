//! Settings and hardware endpoints.

use std::sync::Arc;

use axum::http::StatusCode;
use serde_json::json;
use tokio::sync::Semaphore;

use super::support::*;

#[tokio::test]
async fn settings_get_and_patch() {
    let app = TestApp::new().await;
    let r = app.get("/api/settings").await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.json["auto_queue"], true);
    assert_eq!(r.json["validation"], "standard");
    assert_eq!(r.json["hardware"], "auto");
    assert!(r.json["max_jobs"].is_null());

    let r = app
        .patch(
            "/api/settings",
            json!({ "max_jobs": 4, "onboarded": true, "temp_dir": "  ", "active_hours": { "start": 22, "end": 6 } }),
        )
        .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text);
    assert_eq!(r.json["max_jobs"], 4);
    assert_eq!(r.json["onboarded"], true);
    assert!(r.json["temp_dir"].is_null(), "blank means unset");
    assert_eq!(r.json["active_hours"]["start"], 22);
    // Persisted, and other keys untouched.
    let r = app.get("/api/settings").await;
    assert_eq!(r.json["max_jobs"], 4);
    assert_eq!(r.json["auto_queue"], true);
    let q = app.get("/api/queue").await;
    assert_eq!(q.json["max_jobs"], 4);

    // default_profile is replaced whole and normalized.
    let mut profile = serde_json::to_value(popcorn_batch_core::TranscodeProfile::from_goal(
        popcorn_batch_core::Goal::Compatible,
    ))
    .unwrap();
    profile["audio_codec"] = json!("flac");
    let r = app
        .patch("/api/settings", json!({ "default_profile": profile }))
        .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text);
    assert_eq!(r.json["default_profile"]["container"], "mp4");
    assert_eq!(
        r.json["default_profile"]["audio_codec"], "aac",
        "MP4 can't hold FLAC"
    );
}

#[tokio::test]
async fn settings_validation() {
    let app = TestApp::new().await;
    let file = app.write("x.mkv", "x");
    std::fs::create_dir_all(app.media.join("Movies/out")).unwrap();
    app.add_library("Movies", json!({})).await;
    let cases = vec![
        (json!({ "colour": "gold" }), "unknown_setting"),
        (json!({ "max_jobs": 0 }), "invalid_settings"),
        (json!({ "max_jobs": 33 }), "invalid_settings"),
        (json!({ "max_jobs": "many" }), "invalid_settings"),
        (
            json!({ "active_hours": { "start": 24, "end": 3 } }),
            "invalid_settings",
        ),
        (
            json!({ "ignore_patterns": ["[unclosed"] }),
            "invalid_settings",
        ),
        (json!({ "output_mode": "folder" }), "invalid_settings"),
        (
            json!({ "output_mode": "folder", "output_folder": "/nonexistent/out" }),
            "invalid_settings",
        ),
        (
            json!({ "output_mode": "folder", "output_folder": app.media.join("Movies/out").to_str().unwrap() }),
            "invalid_settings",
        ),
        (
            json!({ "temp_dir": "/nonexistent/scratch" }),
            "invalid_settings",
        ),
        (
            json!({ "temp_dir": "relative/scratch" }),
            "invalid_settings",
        ),
        (
            json!({ "temp_dir": file.to_str().unwrap() }),
            "invalid_settings",
        ),
        (json!({ "validation": "paranoid" }), "invalid_settings"),
        (json!([1, 2, 3]), "invalid_settings"),
    ];
    for (body, code) in cases {
        let r = app.patch("/api/settings", body.clone()).await;
        assert_eq!(r.status, StatusCode::BAD_REQUEST, "{body} -> {}", r.text);
        assert_eq!(r.json["code"], code, "{body} -> {}", r.text);
    }
    let r = app
        .patch(
            "/api/settings",
            json!({ "output_mode": "folder", "output_folder": app.media.join("Movies/out").to_str().unwrap() }),
        )
        .await;
    assert!(
        r.json["error"]
            .as_str()
            .unwrap()
            .contains("inside the library Movies"),
        "{}",
        r.text
    );
    // Nothing was saved by the failed attempts.
    let r = app.get("/api/settings").await;
    assert!(r.json["max_jobs"].is_null());
    assert_eq!(r.json["output_mode"], "replace");
}

#[tokio::test]
async fn popcorn_sr_address_is_saved_trimmed_and_cleared_with_null_or_blank() {
    let app = TestApp::new().await;
    let r = app.get("/api/settings").await;
    assert!(r.json["popcorn_sr_url"].is_null(), "unset by default");
    assert!(
        r.json.as_object().unwrap().contains_key("popcorn_sr_url"),
        "GET returns the key even when it is unset"
    );

    // Set: trimmed, and kept as typed otherwise (not rewritten).
    let r = app
        .patch(
            "/api/settings",
            json!({ "popcorn_sr_url": "  http://tower:8787  " }),
        )
        .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text);
    assert_eq!(r.json["popcorn_sr_url"], "http://tower:8787");
    let r = app.get("/api/settings").await;
    assert_eq!(r.json["popcorn_sr_url"], "http://tower:8787");
    assert_eq!(
        app.state.settings().popcorn_sr_url.as_deref(),
        Some("http://tower:8787")
    );

    // Other changes leave it as it is.
    let r = app.patch("/api/settings", json!({ "max_jobs": 2 })).await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text);
    assert_eq!(r.json["popcorn_sr_url"], "http://tower:8787");

    // https and a path are fine too.
    let r = app
        .patch(
            "/api/settings",
            json!({ "popcorn_sr_url": "https://sr.example.com/" }),
        )
        .await;
    assert_eq!(r.json["popcorn_sr_url"], "https://sr.example.com/");

    // Cleared by null, by an empty string and by spaces only.
    for clear in [json!(null), json!(""), json!("   ")] {
        let r = app
            .patch(
                "/api/settings",
                json!({ "popcorn_sr_url": "http://tower:8787" }),
            )
            .await;
        assert_eq!(r.json["popcorn_sr_url"], "http://tower:8787");
        let r = app
            .patch("/api/settings", json!({ "popcorn_sr_url": clear }))
            .await;
        assert_eq!(r.status, StatusCode::OK, "{clear}: {}", r.text);
        assert!(r.json["popcorn_sr_url"].is_null(), "{clear}: {}", r.text);
        let r = app.get("/api/settings").await;
        assert!(r.json["popcorn_sr_url"].is_null(), "{clear}");
        assert_eq!(app.state.settings().popcorn_sr_url, None);
    }

    // Saved in the database: it is still there after a restart.
    app.patch(
        "/api/settings",
        json!({ "popcorn_sr_url": "http://tower:8787" }),
    )
    .await;
    let dir = app.stop().await;
    let app = TestApp::start(TestOptions {
        dir: Some(dir),
        ..TestOptions::default()
    })
    .await;
    let r = app.get("/api/settings").await;
    assert_eq!(r.json["popcorn_sr_url"], "http://tower:8787");
}

#[tokio::test]
async fn popcorn_sr_address_problems_are_named_in_plain_words() {
    let app = TestApp::new().await;
    let not_full =
        "Enter the full address, starting with http:// or https://, such as http://tower:8787.";
    let login =
        "Leave out the user name and password. Popcorn SR asks for its key when you open it.";
    let too_long = "This address is too long. Use the address you open Popcorn SR at.";
    let longest = format!("http://tower/{}", "a".repeat(2048 - 13));
    let too_long_address = format!("{longest}a");
    let cases = [
        ("javascript:alert(1)", not_full),
        ("ftp://tower", not_full),
        ("tower:8787", not_full),
        ("/sr", not_full),
        ("http://", not_full),
        ("http://user:pass@tower:8787", login),
        ("https://user@tower", login),
        (too_long_address.as_str(), too_long),
    ];
    // A good address is saved first, so a refusal is seen to change nothing.
    let r = app
        .patch(
            "/api/settings",
            json!({ "popcorn_sr_url": "http://tower:8787" }),
        )
        .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text);
    for (address, message) in cases {
        let r = app
            .patch("/api/settings", json!({ "popcorn_sr_url": address }))
            .await;
        let shown = &address[..address.len().min(60)];
        assert_eq!(r.status, StatusCode::BAD_REQUEST, "{shown}: {}", r.text);
        assert_eq!(r.json["code"], "invalid_settings", "{shown}");
        assert_eq!(r.json["field"], "popcorn_sr_url", "{shown}");
        assert_eq!(r.json["error"], message, "{shown}");
        let r = app.get("/api/settings").await;
        assert_eq!(r.json["popcorn_sr_url"], "http://tower:8787", "{shown}");
    }
    // Not text at all: named by field, like the other settings.
    let r = app
        .patch("/api/settings", json!({ "popcorn_sr_url": 8787 }))
        .await;
    assert_eq!(r.status, StatusCode::BAD_REQUEST, "{}", r.text);
    assert_eq!(r.json["code"], "invalid_settings");
    assert_eq!(r.json["field"], "popcorn_sr_url");
    // The longest allowed address is accepted.
    let r = app
        .patch("/api/settings", json!({ "popcorn_sr_url": longest }))
        .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text);
}

/// A database written before the Popcorn SR address existed has no such key
/// in its settings JSON: it still loads, with the address unset, and keeps
/// every other setting.
#[tokio::test]
async fn settings_saved_before_the_popcorn_sr_address_still_load() {
    let app = TestApp::new().await;
    let before = json!({
        "auto_queue": false,
        "watch_folders": true,
        "rescan_interval_hours": 6,
        "max_jobs": 3,
        "hardware": "auto",
        "cpu_fallback": true,
        "validation": "thorough",
        "output_mode": "replace",
        "output_folder": null,
        "temp_dir": null,
        "keep_file_dates": true,
        "low_priority": true,
        "active_hours": { "start": 22, "end": 6 },
        "ignore_patterns": ["**/Extras/**"],
        "min_file_size_mb": 50,
        "onboarded": true,
    });
    assert!(before.get("popcorn_sr_url").is_none());
    crate::db::settings::set_raw(
        app.state.db.pool(),
        crate::db::settings::SETTINGS_KEY,
        &before.to_string(),
    )
    .await
    .unwrap();
    let dir = app.stop().await;
    let app = TestApp::start(TestOptions {
        dir: Some(dir),
        ..TestOptions::default()
    })
    .await;
    let r = app.get("/api/settings").await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text);
    assert!(r.json["popcorn_sr_url"].is_null(), "{}", r.text);
    assert_eq!(r.json["max_jobs"], 3);
    assert_eq!(r.json["auto_queue"], false);
    assert_eq!(r.json["validation"], "thorough");
    assert_eq!(r.json["min_file_size_mb"], 50);
    assert_eq!(r.json["ignore_patterns"][0], "**/Extras/**");
    assert_eq!(r.json["onboarded"], true);
    // And the address can be set on top of it.
    let r = app
        .patch(
            "/api/settings",
            json!({ "popcorn_sr_url": "http://tower:8787" }),
        )
        .await;
    assert_eq!(r.status, StatusCode::OK, "{}", r.text);
    assert_eq!(r.json["max_jobs"], 3);
    assert_eq!(r.json["popcorn_sr_url"], "http://tower:8787");
}

#[tokio::test]
async fn hardware_placeholder_until_detection_finishes() {
    let fake = Arc::new(FakeToolkit {
        detect_gate: Arc::new(Semaphore::new(0)),
        ..FakeToolkit::default()
    });
    let app = TestApp::start(TestOptions {
        fake: fake.clone(),
        wait_ready: false,
        ..TestOptions::default()
    })
    .await;
    let r = app.get("/api/hardware").await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.json["hints"][0]["title"], "Checking your hardware…");
    assert_eq!(r.json["hints"][0]["level"], "info");
    assert_eq!(r.json["detecting"], true);

    // Jobs wait for detection.
    app.write("Movies/a.mkv", h264());
    app.add_library("Movies", json!({})).await;
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    assert!(fake.started().is_empty());

    fake.detect_gate.add_permits(10);
    app.wait_ready().await;
    let r = app.get("/api/hardware").await;
    assert_eq!(r.json["cpu"]["model"], "Fake CPU");
    assert_eq!(r.json["detecting"], false);
    assert_eq!(r.json["recommended_jobs"]["total"], 2);
    app.wait_queue_idle().await;
    assert_eq!(fake.started(), ["a.mkv"]);

    let r = app.post_empty("/api/hardware/detect").await;
    assert_eq!(r.status, StatusCode::OK);
    assert_eq!(r.json["ffmpeg"]["found"], true);
}
