#!/usr/bin/env python3
"""Create or send personalized EP Capstone messages with Apple Mail."""

from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from string import Formatter
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
YEAR = "2026-2027"
DATA_DIR = ROOT / "data" / YEAR
TEMPLATE_DIR = ROOT / "email" / "private" / "templates"


@dataclass(frozen=True)
class Contact:
    name: str
    email: str
    audience: str

    @property
    def first_name(self) -> str:
        return self.name.split()[0] if self.name else ""

    @property
    def last_name(self) -> str:
        return self.name.split()[-1] if self.name else ""


def _clean(value: object) -> str:
    return str(value or "").strip()


def _unique(contacts: Iterable[Contact]) -> list[Contact]:
    by_email: dict[str, Contact] = {}
    for contact in contacts:
        if contact.email:
            by_email.setdefault(contact.email.casefold(), contact)
    return sorted(by_email.values(), key=lambda contact: contact.name.casefold())


def load_students() -> list[Contact]:
    json_path = DATA_DIR / "students-private.local.json"
    if json_path.exists():
        payload = json.loads(json_path.read_text(encoding="utf-8"))
        rows = payload.get("students", payload) if isinstance(payload, dict) else payload
        return _unique(
            Contact(_clean(row.get("name")), _clean(row.get("email")), "students")
            for row in rows
        )

    csv_paths = sorted(DATA_DIR.glob("*students*roster*.csv"))
    if not csv_paths:
        raise FileNotFoundError("No private student roster was found.")
    with csv_paths[0].open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    return _unique(
        Contact(
            " ".join(filter(None, [_clean(row.get("First Name")), _clean(row.get("Last Name"))])),
            _clean(row.get("W&M email") or row.get("Email Address")),
            "students",
        )
        for row in rows
    )


def load_mentors() -> list[Contact]:
    contacts: list[Contact] = []
    for path in sorted((DATA_DIR / "projects").glob("*.json")):
        project = json.loads(path.read_text(encoding="utf-8"))
        people = [project.get("advisor", {})] + list(project.get("coadvisors", []))
        for person in people:
            if isinstance(person, dict):
                contacts.append(
                    Contact(_clean(person.get("name")), _clean(person.get("email")), "mentors")
                )
    return _unique(contacts)


def load_guests() -> list[Contact]:
    path = DATA_DIR / "private" / "guest-speakers.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    return _unique(
        Contact(_clean(row.get("name")), _clean(row.get("email")), "guests")
        for row in payload.get("speakers", [])
    )


def load_irays() -> list[Contact]:
    path = ROOT / "email" / "private" / "contacts" / "irays-research-team.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    return _unique(
        Contact(_clean(row.get("name")), _clean(row.get("email")), "irays")
        for row in payload.get("members", [])
    )


LOADERS = {
    "students": load_students,
    "mentors": load_mentors,
    "guests": load_guests,
    "irays": load_irays,
}


def load_template(name: str) -> tuple[str, str]:
    safe_name = Path(name).stem
    path = TEMPLATE_DIR / f"{safe_name}.txt"
    text = path.read_text(encoding="utf-8")
    first, separator, body = text.partition("\n")
    if not separator or not first.startswith("Subject: "):
        raise ValueError(f"{path} must begin with 'Subject: '.")
    return first.removeprefix("Subject: ").strip(), body.lstrip("\n")


def parse_vars(items: list[str]) -> dict[str, str]:
    values: dict[str, str] = {}
    for item in items:
        key, separator, value = item.partition("=")
        if not separator or not key.strip():
            raise ValueError(f"Invalid --var {item!r}; use key=value.")
        values[key.strip()] = value
    return values


def render(text: str, context: dict[str, str]) -> str:
    missing = {
        field_name
        for _, field_name, _, _ in Formatter().parse(text)
        if field_name and field_name not in context
    }
    if missing:
        raise ValueError(f"Missing template values: {', '.join(sorted(missing))}")
    return text.format_map(context)


def select_contacts(contacts: list[Contact], selectors: list[str]) -> list[Contact]:
    if any(value.casefold() == "all" for value in selectors):
        return contacts
    selected: list[Contact] = []
    for selector in selectors:
        key = selector.casefold()
        matches = [
            contact
            for contact in contacts
            if key in {contact.name.casefold(), contact.email.casefold()}
        ]
        if not matches:
            raise ValueError(f"No contact matches {selector!r}.")
        selected.extend(matches)
    return _unique(selected)


APPLE_SCRIPT = r'''
on run argv
    set messageSubject to item 1 of argv
    set messageBody to item 2 of argv
    set messageAction to item 3 of argv
    set recipientMode to item 4 of argv
    set recipientAddresses to items 5 thru -1 of argv

    tell application "Mail"
        set newMessage to make new outgoing message with properties {subject:messageSubject, content:messageBody & return & return, visible:true}
        tell newMessage
            repeat with recipientAddress in recipientAddresses
                if recipientMode is "bcc" then
                    make new bcc recipient at end of bcc recipients with properties {address:recipientAddress}
                else
                    make new to recipient at end of to recipients with properties {address:recipientAddress}
                end if
            end repeat
            if messageAction is "send" then send
        end tell
        activate
    end tell
end run
'''


def invoke_mail(subject: str, body: str, recipients: list[str], action: str, mode: str) -> None:
    subprocess.run(
        ["osascript", "-e", APPLE_SCRIPT, subject, body, action, mode, *recipients],
        check=True,
    )


def context_for(contact: Contact | None, audience: str, values: dict[str, str]) -> dict[str, str]:
    base = {
        "name": contact.name if contact else "",
        "first_name": contact.first_name if contact else "",
        "last_name": contact.last_name if contact else "",
        "email": contact.email if contact else "",
        "audience": audience,
    }
    return base | values


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("list", "preview", "draft", "send"))
    parser.add_argument("--audience", choices=tuple(LOADERS), required=True)
    parser.add_argument("--recipient", action="append", default=[])
    parser.add_argument("--template")
    parser.add_argument("--var", action="append", default=[], dest="variables")
    parser.add_argument("--group", action="store_true", help="Create one BCC message instead of individual messages.")
    parser.add_argument("--confirm-send", help="Required value: SEND")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        contacts = LOADERS[args.audience]()
        if args.command == "list":
            for contact in contacts:
                print(f"{contact.name} <{contact.email}>")
            print(f"{len(contacts)} contact(s)")
            return 0

        if not args.recipient:
            raise ValueError("Add --recipient NAME, --recipient EMAIL, or --recipient all.")
        if not args.template:
            raise ValueError("Add --template TEMPLATE_NAME.")
        if args.command == "send" and args.confirm_send != "SEND":
            raise ValueError("Sending requires --confirm-send SEND.")

        selected = select_contacts(contacts, args.recipient)
        subject_template, body_template = load_template(args.template)
        values = parse_vars(args.variables)

        if args.group:
            context = context_for(None, args.audience, values)
            messages = [(render(subject_template, context), render(body_template, context), selected)]
        else:
            messages = []
            for contact in selected:
                context = context_for(contact, args.audience, values)
                messages.append(
                    (render(subject_template, context), render(body_template, context), [contact])
                )

        for subject, body, recipients in messages:
            addresses = [contact.email for contact in recipients]
            if args.command == "preview":
                print(f"To: {', '.join(addresses)}\nSubject: {subject}\n\n{body}\n---")
            else:
                invoke_mail(
                    subject,
                    body,
                    addresses,
                    "send" if args.command == "send" else "draft",
                    "bcc" if args.group else "to",
                )
        return 0
    except (FileNotFoundError, json.JSONDecodeError, subprocess.CalledProcessError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
