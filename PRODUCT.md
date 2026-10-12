# Popcorn Batch

## Purpose
Make a whole video library smaller or more compatible without anyone learning ffmpeg. Point Popcorn Batch at a library folder and choose a goal: Save space, Balanced, Plays everywhere or Archive. It converts files in the background with the hardware that passed a real test encode (NVIDIA, Intel, AMD or Apple, and the CPU otherwise), checks every new file against its original, and only then replaces the original or writes the new file to an output folder. Success: deploy one container, pick a folder and a goal, and stop thinking about it while storage frees up.

Popcorn Batch was called Szalinski (and Chrysopoeia before that). It is the batch transcoder of the Popcorn family; Popcorn SR makes enhanced copies with paired processing power.

## Users
Self-hosters with a home media server (Unraid, Synology, TrueNAS, a Linux box or a Mac mini) and a large library served by Plex, Jellyfin or Emby. Many tried Tdarr and left because of its plugin stacks, nodes and GPU setup. Some are comfortable with Docker templates; many do not know what CRF, NVENC or 10-bit mean, and should not need to. They set it up once, then check in for short visits, from a desktop browser or a phone, to see progress and space saved and occasionally fix a failed file. It runs unattended for days or weeks.

## Design
Popcorn family system (see `DESIGN.md`, whose frontmatter matches Popcorn SR's): Taste + Impeccable. Restrained Apple-like hierarchy, native system typography, zinc neutral surfaces, Tailwind blue-500 as the sole action/focus/progress accent with dark text. Tailwind emerald-500/amber-500/red-500 are limited to small status indicators; status text stays neutral and every status has words. One primary action per view. Flat panels, thin dividers, no shadows, no gradients, no fake activity. The one chart (space saved per day) shows real server data and appears only when there are at least three days to compare. 8px control radius, 16px panel radius. 44px touch targets. Light/dark via system preference, reduced-motion-safe transitions. WCAG 2.2 AA contrast and keyboard access everywhere.

Principles:
1. Safe by default: never lose a file. Verify before replacing; explain every skip and failure in a sentence.
2. Decide for the user, let experts override: goals and automatic hardware and job counts first; raw encoder values behind More format options and Technical details.
3. Show progress as outcomes: space saved and files verified, not codec charts.
4. Explain setup problems where they show up, with the exact setting or line to paste.

Terms: a library is a watched folder; a goal is a preset; a job is one file's conversion; verified means the new file passed its checks.

## Journey
1. Install: one container with one port (Unraid template, `docker run` or Compose). Mount the media at `/media`, optionally a fast `/temp`, and pass the GPU through (`/dev/dri` for Intel and AMD, the NVIDIA runtime for NVIDIA). CPU-only needs nothing extra.
2. First run: the welcome says which GPU passed its test encode, or that the CPU will do the work. Choose a folder in the folder picker, then a goal; the goal that suits this machine is marked Best fit and each goal says how fast it converts here. Start.
3. Background work: the folder is scanned; new files wait until they stop changing; files that need work are queued and converted, as many at once as the cores, memory, container limits and GPU allow. Each result is checked, then replaces its original or is written to the output folder. Files that are already efficient are skipped with the reason.
4. Check in: the Overview shows the space saved, one sentence about what is happening now, and Needs your attention only when something needs a fix, grouped by cause with the fix. The Queue shows each running file's stage, progress and attempts; a finished file shows its checks and the size before and after. Copy for a bug report gives the facts in one piece of text.
5. Adjust later: change a library's goal or formats in its Settings tab, and the processing, output, checks and hardware choices in Settings. Optionally add the Popcorn SR address to link to it.

## Honest boundaries
Popcorn Batch never weakens verification to make a file pass. A file that fails a check, cannot be checked (its length can't be read, say), changed while it was converting, or would lose something the target format cannot hold (picture or styled subtitles, fonts, a cover image in MP4 or WebM) keeps its original, and the reason is shown. Lighter checks (Quick) and no checks at all are the owner's choice in Settings › Output; with checks off and originals being replaced, the app warns that a damaged conversion could replace a good original. Replacement survives crashes and power loss: the original is restored from its hidden backup on the next start. Choose Save to a separate folder and the library is never modified.

Hardware is used only after a real test encode on this machine; a GPU that is visible but fails its test, or a device name alone, never counts. A failed hardware encode is retried on the CPU when "If the GPU fails, try the CPU" is on (the default), and the job's tag and attempt history say so; turning it off marks the file failed instead. Apple's GPU works only when run natively on macOS, not in Docker; AMD's proprietary AMF encoder is not in the image (AMD uses VA-API); a Raspberry Pi 4 encodes H.264 only.

Save space and Plays everywhere convert audio to Opus or AAC, so lossless and Atmos tracks do not survive; Balanced and Archive copy audio. HDR is not tone-mapped: an HDR file with an H.264 goal is skipped, as is Dolby Vision profile 5. A changed container changes the extension (`Movie.mp4` becomes `Movie.mkv`), which Sonarr and Radarr see only after their next disk scan. A file with another hard link is skipped because replacing it would not free space. A share that stops answering makes its jobs wait rather than fail; Popcorn Batch cannot repair a hung mount from inside the container.

There is no login: keep it on a trusted network, or put it behind a reverse proxy that adds authentication. It is not a backup tool. The dev mock API and its numbers are fake and never ship in the bundle; documentation screenshots show real conversions of a generated demo library. Popcorn Batch does not contact Popcorn SR; the optional address only adds a link.
