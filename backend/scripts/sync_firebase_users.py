import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Set up paths
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from database import AsyncSessionLocal
from sqlalchemy import select, func
from models.core import User, UserIdentity, Organization, OrgMember, RoleEnum, SubscriptionModel

RAW_DATA = """
saputragmr@gmail.com
Oct 10, 2026
Oct 10, 2026
CD5DGR2y5vegGJqRfUHU6bvokAj2
adeen24667@gmail.com
Oct 6, 2026
Oct 6, 2026
mXl0dJHVxtOJU8Jvtx7O11MjbVJ2
tommymcglynn@gmail.com
Oct 6, 2026
Oct 6, 2026
6bs4foMK6KWGqFdiwDcyBeXKY8y2
manasiworkio09@gmail.com
Sep 29, 2026
Sep 29, 2026
CPRTXOEUFxSkOC3syTKOt0Bm0dP2
magzgaemz@gmail.com
Sep 25, 2026
Sep 25, 2026
Zex2EJqlbYZJWjCa2NXZbBIigFx2
chicoles15@gmail.com
Sep 20, 2026
Sep 20, 2026
g5jH8LChjogFWxoV1ZYlxNdy4sS2
cr7ooooo110@gmail.com
Sep 19, 2026
Sep 19, 2026
hluicHVfaqWQRILEAE7HgdD45O03
mg8kqzn4@anonaddy.me
Sep 19, 2026
Sep 19, 2026
lTy3sPz5KQfIZIrfN3Dj8r9oGpJ3
leonardollopart33@gmail.com
Sep 19, 2026
Sep 19, 2026
TqYE3CvH3XayR9pIE6y76rrCQ3E2
kaykaly54@gmail.com
Sep 17, 2026
Sep 17, 2026
J7wlucw3LMaBuOBLoUQJGmrb1tw1
innovationatwt@gmail.com
Sep 16, 2026
Sep 16, 2026
bNmu0YP1d0cNL57nao1CXSjhV5p1
manthanwork.exe@gmail.com
Sep 7, 2026
Sep 7, 2026
QTsqcdbYBwVtKPBBxxMvjFV1nqt1
nexttechdoor@gmail.com
Aug 26, 2026
Aug 26, 2026
7iTzfdsWsSgWvw4qzKHaLdhZqoR2
sanjoymali4u@gmail.com
Aug 25, 2026
Aug 25, 2026
1ZDxDdMPf7WOhdwz1WJaGHqShX13
oliverquansah123@gmail.com
Aug 23, 2026
Aug 23, 2026
qMR9K0QNfzRphQHH6Tlpo6sO8KC3
sharmasargam9bbps@gmail.com
Aug 22, 2026
Aug 22, 2026
fHgJnzjLO0g89KPYHD7PG9wg4xh2
disha@entrext.com
Aug 19, 2026
Aug 26, 2026
dZaVDtKO6sW2E0zKD5wvH46Twqw2
lucas.casadevito@gmail.com
Aug 14, 2026
Aug 14, 2026
Wt2ac7tw0NSDGhDCBub48jgcrQy2
saumya@entrext.com
Aug 14, 2026
Sep 28, 2026
e0w1wj4qLPOqp6IFNF2T4FOINIu2
stag3.2026@gmail.com
Aug 14, 2026
Aug 14, 2026
QdgjIBHUa6ZJACvvCGmAdu87gOY2
manthangupta2305@gmail.com
Aug 12, 2026
Aug 12, 2026
3gq0zFib0RZBNAp0rwQiC0PTCJB2
webroxofficial@gmail.com
Aug 8, 2026
Sep 19, 2026
xvO41RuzdHQ9D0Dl9OViSFaR9i92
hppatidar12d@gmail.com
Aug 2, 2026
Aug 2, 2026
Dy4UbNed53gbw5GGbeeGKkJBbhD2
dhaval4241@gmail.com
Aug 2, 2026
Aug 2, 2026
dl3psh7EhnfwScHts5uYOjbWIco2
saumyavishwam@gmail.com
Jul 27, 2026
Oct 4, 2026
taIRWrwQ6wfddK0dLaRLjqU10tX2
uzairsarwar542@gmail.com
Jul 27, 2026
Jul 27, 2026
yVWSPGarORVZx9DF756MgM0dCFB2
sathvikatummala9361@gmail.com
Jul 27, 2026
Jul 27, 2026
qhr2Ce6lFtdlyHzJeKKY7ZIS3KC3
hetpatel.200410107006@gmail.com
Jul 25, 2026
Jul 25, 2026
MYGg62T6p5ZTQoUiZHCMM4fAHEs1
disha.entrext@gmail.com
Jul 22, 2026
Aug 12, 2026
4lUCkv35F1QNXvt5uJAAN86fOqh1
saumya84888@gmail.com
Jul 22, 2026
Jul 22, 2026
lE0Ci0edv8ShJwHUW9MeE9oqTmm1
pixelmark2026@gmail.com
Jul 18, 2026
Aug 8, 2026
iuFPdzK5SthkMkRKYgkOrEL5J4s2
"""

def parse_entries():
    lines = [l.strip() for l in RAW_DATA.strip().split("\n") if l.strip()]
    entries = []
    i = 0
    while i < len(lines):
        if "@" in lines[i]:
            email = lines[i]
            created_str = lines[i+1]
            last_login_str = lines[i+2]
            uid = lines[i+3]
            entries.append({
                "email": email,
                "created_str": created_str,
                "last_login_str": last_login_str,
                "uid": uid
            })
            i += 4
        else:
            i += 1
    return entries

def parse_date(date_str: str) -> datetime:
    dt = datetime.strptime(date_str.strip(), "%b %d, %Y")
    return dt.replace(tzinfo=timezone.utc)

async def sync_all():
    entries = parse_entries()
    print(f"Parsed {len(entries)} users from Firebase Console dump.")

    async with AsyncSessionLocal() as db:
        synced_count = 0
        updated_count = 0

        for item in entries:
            email = item["email"].strip().lower()
            created_at = parse_date(item["created_str"])
            last_login_at = parse_date(item["last_login_str"])
            uid = item["uid"]

            try:
                # 1. Check if identity already exists by firebase uid
                ident_res = await db.execute(
                    select(UserIdentity).where(
                        UserIdentity.provider == "firebase",
                        UserIdentity.provider_user_id == uid
                    )
                )
                existing_ident = ident_res.scalars().first()

                user = None
                if existing_ident:
                    user_res = await db.execute(select(User).where(User.id == existing_ident.user_id))
                    user = user_res.scalar_one_or_none()

                # 2. Check if user already exists by email if not found by identity
                if not user:
                    user_res = await db.execute(select(User).where(func.lower(User.email) == email))
                    user = user_res.scalar_one_or_none()

                display_name = email.split("@")[0].replace(".", " ").capitalize()

                if not user:
                    user = User(
                        id=str(uuid.uuid4()),
                        email=email,
                        name=display_name,
                        hashed_password="firebase_auth_managed",
                        is_verified=True,
                        created_at=created_at,
                        last_login_at=last_login_at
                    )
                    db.add(user)
                    await db.flush()

                    # Create personal workspace organization
                    org = Organization(
                        id=str(uuid.uuid4()),
                        name=f"{display_name}'s Workspace",
                        slug=f"org-{str(uuid.uuid4())[:8]}",
                        is_internal=("entrext.com" in email)
                    )
                    db.add(org)
                    await db.flush()

                    # Add membership
                    mem = OrgMember(
                        id=str(uuid.uuid4()),
                        org_id=org.id,
                        user_id=user.id,
                        role=RoleEnum.owner
                    )
                    db.add(mem)

                    # Default free subscription
                    sub = SubscriptionModel(
                        id=str(uuid.uuid4()),
                        org_id=org.id,
                        plan_type="stage_team" if ("entrext.com" in email or "saumya" in email) else "none",
                        status="active",
                        plan_source="auto_synced",
                        seats_allowed=10 if ("entrext.com" in email or "saumya" in email) else 1,
                        projects_allowed=10 if ("entrext.com" in email or "saumya" in email) else 1
                    )
                    db.add(sub)

                    if not existing_ident:
                        ident = UserIdentity(
                            id=str(uuid.uuid4()),
                            user_id=user.id,
                            provider="firebase",
                            provider_user_id=uid,
                            provider_email=email,
                            email_verified=True
                        )
                        db.add(ident)
                    synced_count += 1
                else:
                    # Update existing user timestamps if from Firebase
                    user.created_at = created_at
                    user.last_login_at = last_login_at
                    user.is_verified = True
                    if not user.name:
                        user.name = display_name
                    db.add(user)

                    # Ensure identity exists
                    if not existing_ident:
                        ident_check = await db.execute(
                            select(UserIdentity).where(
                                UserIdentity.provider == "firebase",
                                UserIdentity.provider_user_id == uid
                            )
                        )
                        if not ident_check.scalars().first():
                            ident = UserIdentity(
                                id=str(uuid.uuid4()),
                                user_id=user.id,
                                provider="firebase",
                                provider_user_id=uid,
                                provider_email=email,
                                email_verified=True
                            )
                            db.add(ident)

                    # Ensure org exists
                    mem_res = await db.execute(select(OrgMember).where(OrgMember.user_id == user.id))
                    if not mem_res.scalar_one_or_none():
                        org = Organization(
                            id=str(uuid.uuid4()),
                            name=f"{display_name}'s Workspace",
                            slug=f"org-{str(uuid.uuid4())[:8]}",
                            is_internal=("entrext.com" in email)
                        )
                        db.add(org)
                        await db.flush()
                        mem = OrgMember(
                            id=str(uuid.uuid4()),
                            org_id=org.id,
                            user_id=user.id,
                            role=RoleEnum.owner
                        )
                        db.add(mem)

                    updated_count += 1

                await db.commit()
            except Exception as e:
                await db.rollback()
                print(f"Skipping or error on {email}: {e}")

        print(f"Successfully synced! Added: {synced_count} new users, Updated: {updated_count} existing users.")

        # Print total users now in DB
        total_res = await db.execute(select(func.count(User.id)))
        print(f"Total registered users in database now: {total_res.scalar()}")

if __name__ == "__main__":
    asyncio.run(sync_all())
