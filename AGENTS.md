# Repository Workflow Rule

## Mandatory After Every Completed Task

When code/content work requested by the user is complete:

1. Commit and push to `main`.
2. Use `push_notify.ps1` so Telegram notification is sent with what was done.

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
