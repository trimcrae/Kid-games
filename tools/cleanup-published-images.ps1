# Remove generated originals only after their final images are verified in Git.
# The private JSON plan records source/final hashes and protected working images.
param(
    [Parameter(Mandatory = $true)][string]$Plan,
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$inventory = Get-Content -LiteralPath $Plan -Raw | ConvertFrom-Json
$sourceRoot = (Resolve-Path -LiteralPath $inventory.generatedRoot).Path.TrimEnd('\') + '\'
$repoRoot = (Resolve-Path -LiteralPath $inventory.repo).Path.TrimEnd('\') + '\'
$remote = & git -C $inventory.repo ls-remote origin refs/heads/main
if ($LASTEXITCODE -ne 0 -or ($remote -split '\s+')[0] -ne $inventory.remoteMain) {
    throw 'Remote main changed or is unavailable; rebuild the cleanup plan.'
}
$protected = @($inventory.protectedOriginals | ForEach-Object { [IO.Path]::GetFullPath($_).ToLowerInvariant() })
$checked = @()
foreach ($item in $inventory.items) {
    $source = [IO.Path]::GetFullPath($item.source)
    $retained = [IO.Path]::GetFullPath($item.retained)
    if (-not $source.StartsWith($sourceRoot, [StringComparison]::OrdinalIgnoreCase) -or
        -not $retained.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or
        $protected -contains $source.ToLowerInvariant()) { throw "Unsafe path: $source" }
    # Resolve every ancestor to reject directory junctions as well as file links.
    foreach ($file in @($source, $retained)) {
        $entry = Get-Item -LiteralPath $file
        while ($null -ne $entry) {
            if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked path: $file" }
            $entry = if ($entry -is [IO.FileInfo]) { $entry.Directory } else { $entry.Parent }
        }
    }
    if ([IO.Path]::GetExtension($source) -ne '.png') { throw "Not a generated PNG: $source" }
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne $item.sourceSha256 -or
        (Get-FileHash -LiteralPath $retained -Algorithm SHA256).Hash -ne $item.retainedSha256) {
        throw "Changed image: $source"
    }
    $relative = $retained.Substring($repoRoot.Length).Replace('\', '/')
    $publishedBlob = & git -C $inventory.repo rev-parse "$($inventory.remoteMain):$relative"
    if ($LASTEXITCODE -ne 0 -or $publishedBlob -ne $item.gitBlob) { throw "Unpublished image: $relative" }
    $currentBlob = & git -C $inventory.repo hash-object -- $relative
    if ($LASTEXITCODE -ne 0 -or $currentBlob -ne $publishedBlob) { throw "Uncommitted image: $relative" }
    $checked += $item
}
$bytes = [long](($checked | Measure-Object bytes -Sum).Sum)
if (-not $Apply) {
    @{ verifiedOriginals = $checked.Count; reclaimBytes = $bytes; dryRun = $true } | ConvertTo-Json -Compress
    exit
}
$receiptPath = "$Plan.removed.json"
if (Test-Path -LiteralPath $receiptPath) { throw 'Cleanup receipt already exists; build a fresh plan.' }
$removed = [Collections.Generic.List[object]]::new()
foreach ($item in $checked) {
    # A single named file, never a recursive directory deletion.
    Remove-Item -LiteralPath $item.source -Force
    $removed.Add(@{ source = $item.source; sourceSha256 = $item.sourceSha256; retained = $item.retained; retainedSha256 = $item.retainedSha256; bytes = $item.bytes })
    @{ removedAtUtc = [DateTime]::UtcNow.ToString('o'); publishedCommit = $inventory.remoteMain; removed = @($removed.ToArray()) } |
        ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $receiptPath
}
@{ removedOriginals = $removed.Count; recoveredBytes = $bytes; receipt = $receiptPath } | ConvertTo-Json -Compress
