#!/usr/bin/env bash
#
# check-rebuild.sh — does the current code need a fresh EAS dev build, or can I
# just test it over Metro (`expo start --dev-client`)?
#
# A development build only needs rebuilding when the NATIVE layer changes
# (native deps, config plugins, app.json native config, SDK/RN bump). Pure
# JS/TS merges stream live from Metro. This script tells you which case you're in
# by (1) running expo-doctor and (2) comparing the current project's native
# "fingerprint" against your latest finished dev build on EAS.
#
# Usage:
#   npm run rebuild:check            # defaults to android
#   npm run rebuild:check -- ios     # or: bash scripts/check-rebuild.sh ios
#
set -uo pipefail

# Resolve platform arg (accepts "android", "ios", or "--platform android")
PLATFORM="android"
for a in "$@"; do
  case "$a" in
    android|ios) PLATFORM="$a" ;;
  esac
done

cd "$(dirname "$0")/.." || exit 1

echo "▶ Checking whether a rebuild is needed ($PLATFORM development build)…"
echo

# 1) expo-doctor — catches version/native mismatches (this is what would have
#    caught the expo-font@57 vs SDK-55 crash before it ever shipped).
echo "── expo-doctor ─────────────────────────────────"
if npx expo-doctor; then
  echo "✅ expo-doctor: no issues."
else
  echo "⚠  expo-doctor flagged issues (above). Consider: npx expo install --fix"
fi
echo

# 2) Find the latest finished development build on EAS.
echo "── latest finished dev build ───────────────────"
BUILD_JSON="$(npx eas-cli build:list --platform "$PLATFORM" --profile development \
  --status finished --limit 1 --json --non-interactive 2>/dev/null)"

read -r BID BDATE <<EOF
$(printf '%s' "$BUILD_JSON" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  let a=[]; try{a=JSON.parse(d||'[]')}catch(e){}
  const b=a[0];
  if(!b){console.log('');process.exit(0)}
  console.log(b.id||'', b.completedAt||b.updatedAt||b.createdAt||'');
});")
EOF

if [ -z "${BID:-}" ]; then
  echo "No finished development build found for $PLATFORM."
  echo "→ 🔁 Make one:  eas build --profile development --platform $PLATFORM"
  exit 0
fi
echo "id:   $BID"
echo "when: ${BDATE:-unknown}"

# Artifact-expiry warning (~30-day retention on the free plan): even with no
# native changes, an expired APK can't be reinstalled → rebuild to get one.
if [ -n "${BDATE:-}" ]; then
  AGE_DAYS="$(node -e "const t=new Date('$BDATE').getTime();console.log(isNaN(t)?-1:Math.floor((Date.now()-t)/86400000))")"
  if [ "${AGE_DAYS:-0}" -ge 30 ] 2>/dev/null; then
    echo "⏰ This build is ${AGE_DAYS}d old — its installable APK has likely expired (30-day limit)."
    echo "   You'll need to rebuild just to reinstall on a phone that doesn't already have it."
  fi
fi
echo

# 3) Compare native fingerprints: build vs current working tree.
#
#    A top-level hash mismatch alone is too blunt: @expo/fingerprint also hashes
#    package.json `scripts` and other non-native metadata, so editing an npm
#    script flips the hash without any native change. We therefore diff at the
#    SOURCE level and ignore sources that can't affect the native build.
echo "── native fingerprint (build vs current code) ──"
echo
CMP_JSON="$(npx eas-cli fingerprint:compare --build-id "$BID" --json --non-interactive 2>/dev/null)"
printf '%s' "$CMP_JSON" | BID="$BID" PLATFORM="$PLATFORM" node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const BID=process.env.BID, PLATFORM=process.env.PLATFORM;
  let o; try{o=JSON.parse(d)}catch(e){o=null}
  if(!o||!o.fingerprint1||!o.fingerprint2){
    console.log('⚠  Could not read the fingerprint comparison (network/CLI issue,');
    console.log('   or the build predates fingerprinting). Check manually:');
    console.log('       npx eas-cli fingerprint:compare --build-id '+BID);
    process.exit(0);
  }
  const key=s=>(s.filePath||s.type)+' ['+(s.reasons||[]).join(',')+']';
  const map=f=>{const m={};(f.sources||[]).forEach(s=>{m[key(s)]=s.hash});return m};
  const A=map(o.fingerprint1), B=map(o.fingerprint2);
  const diffs=[...new Set([...Object.keys(A),...Object.keys(B)])].filter(k=>A[k]!==B[k]);

  // Sources that never affect the native binary → safe to ignore for rebuild.
  const isCosmetic=k=>/packageJson:scripts|packageJson:(name|version|description|private|jest|prettier|eslintConfig)/.test(k);
  const nativeDiffs=diffs.filter(k=>!isCosmetic(k));
  const cosmeticDiffs=diffs.filter(isCosmetic);

  if(diffs.length===0){
    console.log('✅ Native fingerprint MATCHES the installed build.');
    console.log('   → No rebuild needed. Test the new code over Metro:');
    console.log('       npx expo start --dev-client --clear');
  } else if(nativeDiffs.length===0){
    console.log('✅ No NATIVE changes vs the installed build — safe to test over Metro.');
    console.log('   (Fingerprint differs only in non-native metadata, no rebuild needed:');
    cosmeticDiffs.forEach(k=>console.log('      · '+k));
    console.log('   )');
    console.log('   → npx expo start --dev-client --clear');
  } else {
    console.log('🔁 NATIVE changes detected — a rebuild is required before this code');
    console.log('   will run on the dev build. Changed native inputs:');
    nativeDiffs.forEach(k=>console.log('      • '+k));
    console.log('   → eas build --profile development --platform '+PLATFORM);
    console.log('   Full diff:  npx eas-cli fingerprint:compare --build-id '+BID+' --open');
  }
});"
