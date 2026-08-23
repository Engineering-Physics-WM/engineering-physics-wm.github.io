# EP Capstone email helper

`apple_mail.py` loads the private student roster, project mentor contacts, or guest-speaker contacts and creates messages in Apple Mail.

Private templates live in `email/private/templates/`. That directory and `email/drafts/` are ignored by Git and are not deployed with the website.

## Commands

```bash
# Check an audience
python3 email/apple_mail.py list --audience guests

# Preview one personalized message in the terminal
python3 email/apple_mail.py preview --audience guests \
  --recipient "Len Neighbors" \
  --template guest-speaker \
  --var topic="Public Speaking" \
  --var date="October 12, 2026"

# Open the message as a draft in Apple Mail
python3 email/apple_mail.py draft --audience guests \
  --recipient "Len Neighbors" \
  --template guest-speaker \
  --var topic="Public Speaking" \
  --var date="October 12, 2026"

# Make one BCC draft for all students
python3 email/apple_mail.py draft --audience students --recipient all \
  --template student-announcement --group \
  --var announcement="Class will meet in Small 235."
```

`draft` is the normal workflow. `send` sends immediately and is intentionally gated by `--confirm-send SEND`:

```bash
python3 email/apple_mail.py send ... --confirm-send SEND
```

The first Mail action may cause macOS to ask whether Terminal or Visual Studio Code may control Mail. Grant access only if you want the integration enabled.

## Template format

The first line supplies the subject; the remainder is the plain-text body. Supported built-in fields are `{name}`, `{first_name}`, `{last_name}`, `{email}`, and `{audience}`. Add other values with repeated `--var key=value` arguments.

```text
Subject: A short subject for {first_name}

Dear {first_name},

Your message here.

Best,
Ran
```

Use `--group` only with templates that do not contain person-specific fields such as `{first_name}`.
