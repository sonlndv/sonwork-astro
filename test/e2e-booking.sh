#!/usr/bin/env bash
# End-to-end against a running `wrangler dev`. No credentials are configured,
# so the mailer stays in no-send mode and logs instead of delivering.
#
# Each case sends a distinct cf-connecting-ip: the per-IP limiter is real and
# would otherwise starve later cases. The rate-limit case reuses one IP on purpose.
set -u
B=http://127.0.0.1:8788
pass=0; fail=0
ck(){ if [ "$2" = "$3" ]; then printf '  ok   %-46s %s\n' "$1" "$2"; pass=$((pass+1));
      else printf '  FAIL %-46s got=%s want=%s\n' "$1" "$2" "$3"; fail=$((fail+1)); fi; }
yes_(){ printf '  ok   %s\n' "$1"; pass=$((pass+1)); }
no_(){  printf '  FAIL %s\n' "$1"; fail=$((fail+1)); }

IPN=0
IPB=$(( (RANDOM % 200) + 10 ))   # fresh /24 each run: KV keeps limiter state across runs
post(){ # post <out-file> <json>
  IPN=$((IPN+1))
  printf '%s' "$2" > /tmp/body.$$.json
  curl -s --max-time 15 -o "$1" -w '%{http_code}' \
    -X POST "$B/api/meeting-requests" \
    -H "cf-connecting-ip:203.0.$IPB.$IPN" \
    -H 'content-type:application/json' --data-binary @/tmp/body.$$.json
}

R=$$                      # unique per run, so reruns are not duplicates
now=$(( $(date +%s) * 1000 - 9000 ))
PURPOSE="I would like to talk about operational automation and what actually holds up in production."
mk(){ printf '{"name":"%s","email":"%s","purpose":"%s","topic":"agents","duration":30,"timezone":"Asia/Ho_Chi_Minh","consent":true,"startedAt":%s}' "$1" "$2" "$PURPOSE" "$now"; }

echo "== pages =="
for p in / /book/ /book/status/ /about/; do
  ck "GET $p" "$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' "$B$p")" "200"
done

echo "== validation =="
ck "empty body rejected" "$(post /tmp/r1 '{}')" "422"
grep -q 'problems' /tmp/r1 && yes_ "problems listed" || no_ "no problems array"
badbody=$(printf '{"name":"A","email":"nope","purpose":"short","consent":true,"startedAt":%s}' "$now")
ck "bad email + short purpose rejected" "$(post /tmp/r2 "$badbody")" "422"

echo "== honeypot / timing =="
hp=$(printf '{"name":"Bot","email":"bot-%s@example.com","purpose":"%s","topic":"agents","duration":30,"consent":true,"company":"AcmeCorp","startedAt":%s}' "$R" "$PURPOSE" "$now")
ck "honeypot answered blandly (no record)" "$(post /tmp/r3 "$hp")" "200"
grep -q '"id":null' /tmp/r3 && yes_ "honeypot filed nothing" || no_ "honeypot may have filed a record: $(cat /tmp/r3)"
fastbody=$(printf '{"name":"Fast","email":"fast-%s@example.com","purpose":"%s","topic":"agents","duration":30,"consent":true,"startedAt":%s000}' "$R" "$PURPOSE" "$(date +%s)")
ck "instant submission rejected" "$(post /tmp/r4 "$fastbody")" "422"

echo "== no-send mode (no credentials wired) =="
ck "request created" "$(post /tmp/ns "$(mk 'Mode Check' "mode-$R@example.com")")" "201"
grep -q '"mode":"no-send"' /tmp/ns && yes_ "mailer in no-send mode" || no_ "mode: $(cat /tmp/ns)"
grep -q '"owner":false'    /tmp/ns && yes_ "no owner email attempted" || no_ "owner send attempted"
grep -q '"visitor":false'  /tmp/ns && yes_ "no visitor email attempted" || no_ "visitor send attempted"

echo "== happy path =="
ck "request created" "$(post /tmp/ok "$(mk 'Trần Minh' "minh-$R@example.com")")" "201"
tok=$(sed -n 's#.*statusUrl":"/book/status/?t=\([a-f0-9]*\)".*#\1#p' /tmp/ok)
id=$(sed -n 's/.*"id":"\([a-f0-9]*\)".*/\1/p' /tmp/ok)
[ ${#tok} -eq 48 ] && yes_ "status token issued (48 hex)" || no_ "token len=${#tok}"
[ ${#id}  -eq 32 ] && yes_ "opaque id issued (32 hex)"    || no_ "id len=${#id}"
case "$id" in *"@"*|*minh*) no_ "id derived from email";; *) yes_ "id is not derived from the email";; esac

echo "== status read =="
curl -s --max-time 15 -o /tmp/st "$B/api/meeting-requests/status?t=$tok"
grep -q '"status":"pending"' /tmp/st && yes_ "status reads pending" || no_ "status: $(cat /tmp/st)"
if grep -qiE 'minh-|"purpose"|"ip"|"notes"|tokenHash' /tmp/st; then no_ "status leaks private fields: $(cat /tmp/st)"
else yes_ "status leaks nothing private"; fi
ck "unknown token 404" "$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' "$B/api/meeting-requests/status?t=$(printf 'a%.0s' $(seq 48))")" "404"
ck "malformed token 404 (no oracle)" "$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' "$B/api/meeting-requests/status?t=xyz")" "404"

echo "== duplicate =="
ck "duplicate answered 200, not 201" "$(post /tmp/d2 "$(mk 'Trần Minh' "minh-$R@example.com")")" "200"
grep -q '"duplicate":true' /tmp/d2 && yes_ "duplicate collapsed, not re-filed" || no_ "dupe: $(cat /tmp/d2)"

echo "== admin is closed without a secret =="
ck "admin list refused" "$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' "$B/api/meeting-requests/admin")" "404"
ck "admin list refused w/ guess" "$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' -H 'authorization:Bearer guess' "$B/api/meeting-requests/admin")" "404"
ck "admin action refused" "$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' -X POST "$B/api/meeting-requests/admin" -H 'content-type:application/json' -d "{\"id\":\"$id\",\"action\":\"confirm\"}")" "404"
curl -s --max-time 15 -o /tmp/st2 "$B/api/meeting-requests/status?t=$tok"
grep -q '"status":"pending"' /tmp/st2 && yes_ "request unchanged after admin attempts" || no_ "state moved without auth"

flood(){ printf '{"name":"Flood %s","email":"flood-%s@example.com","purpose":"Request %s about operational automation and what actually holds up in production.","topic":"agents","duration":30,"consent":true,"startedAt":%s}' "$1" "$R" "$1" "$now"; }

echo "== rate limit (single IP, per-email) =="
hit=0
for i in 1 2 3 4 5 6 7 8; do
  c=$(curl -s --max-time 15 -o /dev/null -w '%{http_code}' -X POST "$B/api/meeting-requests" \
      -H "cf-connecting-ip:198.51.$IPB.7" -H 'content-type:application/json' \
      -d "$(flood "$i")")
  [ "$c" = "429" ] && hit=1
done
ck "burst eventually rate-limited" "$hit" "1"

echo
echo "passed=$pass failed=$fail"
[ $fail -eq 0 ]
