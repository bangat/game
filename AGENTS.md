# Repository Workflow Rule

## Mandatory After Every Completed Task

When code/content work requested by the user is complete:

1. Commit and push to `main`.
2. Use `push_notify.ps1` so Telegram notification is sent with what was done.
3. Telegram report text must be written in Korean.

## Telegram Mirror Rule (This Repo)

When the user asks to see answers on mobile, mirror each assistant response to Telegram too.

- Send via `.\tele_send.ps1 -Text <text>`
- Use real newlines (PowerShell uses `` `n ``), or type `\n` and let `tele_send.ps1` interpret it.
- Do not send secrets (tokens, keys, passwords) to Telegram.

### Preferred command

```powershell
.\push_notify.ps1 -Message "chore: <short summary>"
```

### If only specific file(s) changed

```powershell
.\push_notify.ps1 -Files "<file1>","<file2>" -Message "chore: <short summary>"
```

### Failure handling

- If push or Telegram notify fails, report the exact reason and retry once after fixing the immediate cause.
