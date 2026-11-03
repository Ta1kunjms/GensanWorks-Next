"""Generate Figures 8-20 as draw.io files in the visual style of Figure 8.

Style is copied from the owner's hand-made Figure 8 (GensanWorks-Figure 8.drawio.svg):
black 1px strokes, white fills, Helvetica, 11px labels, UML actors 52x104,
use-case ellipses 163.5x44.6, dashed <<include>>/<<extend>> edges with 8px labels,
plain straight association lines. Figures 13-20 reuse the same palette and type.

Run:  python generate_figures.py   (writes .drawio files next to this script)
Open each file in diagrams.net / draw.io desktop and export SVG/PNG for the manuscript.
"""
from __future__ import annotations

import html
import os
from dataclasses import dataclass, field

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- styles (Figure 8)
FONT = "fontFamily=Helvetica;fontColor=#000000;"
ACTOR = ("shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;"
         "outlineConnect=0;strokeColor=#000000;fillColor=#ffffff;fontSize=12;" + FONT)
ELLIPSE = ("ellipse;whiteSpace=wrap;html=1;align=center;strokeColor=#000000;"
           "fillColor=#ffffff;fontSize=11;" + FONT)
ASSOC = "rounded=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;endFill=0;strokeColor=#000000;"
DASHED = ("endArrow=classic;html=1;rounded=0;dashed=1;startArrow=none;startFill=0;"
          "strokeColor=#000000;fontSize=8;labelBackgroundColor=#ffffff;" + FONT)
BOX = ("rounded=0;whiteSpace=wrap;html=1;strokeColor=#000000;fillColor=#ffffff;"
       "fontSize=11;" + FONT)
RBOX = BOX.replace("rounded=0", "rounded=1;arcSize=12")
CONTAINER = ("rounded=0;whiteSpace=wrap;html=1;strokeColor=#000000;fillColor=none;"
             "fontSize=12;fontStyle=1;verticalAlign=top;align=left;spacingLeft=8;spacingTop=4;" + FONT)
NODE3D = ("shape=cube;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;darkOpacity=0;"
          "darkOpacity2=0;size=10;strokeColor=#000000;fillColor=#ffffff;fontSize=11;"
          "verticalAlign=top;align=left;spacingLeft=8;spacingTop=4;" + FONT)
ARROW = ("endArrow=classic;html=1;rounded=0;strokeColor=#000000;fontSize=9;"
         "labelBackgroundColor=#ffffff;edgeStyle=orthogonalEdgeStyle;" + FONT)
STRAIGHT_ARROW = ARROW.replace("edgeStyle=orthogonalEdgeStyle;", "")
CIRCLE = ("ellipse;whiteSpace=wrap;html=1;aspect=fixed;strokeColor=#000000;fillColor=#ffffff;"
          "fontSize=11;" + FONT)
STORE = ("shape=partialRectangle;whiteSpace=wrap;html=1;left=1;right=0;top=1;bottom=1;"
         "strokeColor=#000000;fillColor=#ffffff;fontSize=11;align=left;spacingLeft=6;" + FONT)
TEXT = "text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;fontSize=11;" + FONT


BR = "<br>"


def esc(s: str) -> str:
    return html.escape(s, quote=True)


class Diagram:
    def __init__(self, name: str):
        self.name = name
        self.cells: list[str] = []
        self.n = 2

    def _id(self) -> str:
        self.n += 1
        return f"c{self.n}"

    def vertex(self, value: str, style: str, x: float, y: float, w: float, h: float, parent="1") -> str:
        i = self._id()
        self.cells.append(
            f'<mxCell id="{i}" value="{esc(value)}" style="{style}" vertex="1" parent="{parent}">'
            f'<mxGeometry x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" as="geometry"/></mxCell>')
        return i

    def edge(self, src: str, tgt: str, style: str, value: str = "", points: list[tuple[float, float]] | None = None) -> str:
        i = self._id()
        pts = ""
        if points:
            pts = '<Array as="points">' + "".join(f'<mxPoint x="{x:.1f}" y="{y:.1f}"/>' for x, y in points) + "</Array>"
        self.cells.append(
            f'<mxCell id="{i}" value="{esc(value.replace(chr(10), BR))}" style="{style}" edge="1" parent="1" source="{src}" target="{tgt}">'
            f'<mxGeometry relative="1" as="geometry">{pts}</mxGeometry></mxCell>')
        return i

    def xml(self) -> str:
        body = "".join(self.cells)
        return (f'<diagram name="{esc(self.name)}" id="{esc(self.name.split(" ")[0] + self.name.split(" ")[1])}">'
                '<mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" '
                'arrows="1" fold="1" page="0" pageScale="1" math="0" shadow="0" background="#ffffff">'
                f'<root><mxCell id="0"/><mxCell id="1" parent="0"/>{body}</root></mxGraphModel></diagram>')


def save(diagrams: list[Diagram], filename: str) -> None:
    content = '<mxfile host="app.diagrams.net">' + "".join(d.xml() for d in diagrams) + "</mxfile>"
    with open(os.path.join(OUT_DIR, filename), "w", encoding="utf-8") as f:
        f.write(content)


# ---------------------------------------------------------------- use case diagrams
UC_W, UC_H = 163.5, 44.6
PITCH = 66.0          # Figure 8 job-seeker block uses ~67px row pitch
ACTOR_W, ACTOR_H = 52.0, 104.0
GAP_ACTOR = 120.0     # actor body to first use-case column
GAP_CHILD = 75.0      # parent column to <<include>>/<<extend>> column


@dataclass
class UC:
    name: str
    children: list[tuple[str, str]] = field(default_factory=list)  # (kind, name) kind: include|extend

    @property
    def rows(self) -> int:
        return max(1, len(self.children))


def use_case_diagram(title: str, actor_label: str, left: list[UC], right: list[UC]) -> Diagram:
    d = Diagram(title)
    x_lc = 0.0
    x_lp = x_lc + UC_W + GAP_CHILD
    x_actor = x_lp + UC_W + GAP_ACTOR
    x_rp = x_actor + ACTOR_W + GAP_ACTOR
    x_rc = x_rp + UC_W + GAP_CHILD

    rows_l = sum(u.rows for u in left)
    rows_r = sum(u.rows for u in right)
    height = max(rows_l, rows_r) * PITCH
    actor = d.vertex(f"<b>{actor_label[0]}</b><div><font style=\"font-size: 11px;\">{actor_label[1]}</font></div>",
                     ACTOR, x_actor, height / 2 - ACTOR_H / 2 - 20, ACTOR_W, ACTOR_H)

    def side(ucs: list[UC], x_parent: float, x_child: float, is_left: bool, total_rows: int) -> None:
        y = (height - total_rows * PITCH) / 2
        for u in ucs:
            block = u.rows * PITCH
            py = y + block / 2 - UC_H / 2
            p = d.vertex(u.name, ELLIPSE, x_parent, py, UC_W, UC_H)
            if is_left:
                d.edge(actor, p, ASSOC + "exitX=0;exitY=0.3333;exitDx=0;exitDy=0;exitPerimeter=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;")
            else:
                d.edge(actor, p, ASSOC + "exitX=1;exitY=0.3333;exitDx=0;exitDy=0;exitPerimeter=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;")
            for k, (kind, name) in enumerate(u.children):
                cy = y + k * PITCH + (PITCH - UC_H) / 2
                c = d.vertex(name, ELLIPSE, x_child, cy, UC_W, UC_H)
                near_p = "exitX=0;exitY=0.5;" if is_left else "exitX=1;exitY=0.5;"
                far_c = "entryX=1;entryY=0.5;" if is_left else "entryX=0;entryY=0.5;"
                near_c = "exitX=1;exitY=0.5;" if is_left else "exitX=0;exitY=0.5;"
                far_p = "entryX=0;entryY=0.5;" if is_left else "entryX=1;entryY=0.5;"
                if kind == "include":   # base -> included use case
                    d.edge(p, c, DASHED + near_p + far_c + "exitDx=0;exitDy=0;entryDx=0;entryDy=0;", "&lt;&lt;include&gt;&gt;")
                else:                   # extension -> base use case
                    d.edge(c, p, DASHED + near_c + far_p + "exitDx=0;exitDy=0;entryDx=0;entryDy=0;", "&lt;&lt;extend&gt;&gt;")
            y += block

    side(left, x_lp, x_lc, True, rows_l)
    side(right, x_rp, x_rc, False, rows_r)
    return d


def I(n):
    return ("include", n)


def E(n):
    return ("extend", n)


def fig08() -> Diagram:
    """Consolidated use case diagram, positions copied from the owner's hand-made Figure 8."""
    d = Diagram("Figure 8 - Consolidated Use Case Diagram")

    def actor(name, label, x, y):
        return d.vertex(f"<b>{name}</b><div><font style=\"font-size: 11px;\">{label}</font></div>",
                        ACTOR, x, y, ACTOR_W, ACTOR_H)

    def uc(name, x, y, w=UC_W, h=UC_H):
        return d.vertex(name, ELLIPSE, x, y, w, h)

    guest = actor("Guest", "(Unauthenticated User)", 171.0, 109.7)
    seeker = actor("Job Seeker", "(Authenticated User)", 171.0, 429.3)
    employer = actor("Employer", "(Authenticated User)", 946.9, 257.8)
    admin = actor("Administrator", "(Authenticated User)", 946.9, 485.8)

    landing = uc("View Landing Page", 311.7, 40.0)
    browse = uc("Browse Public Job Listing", 311.7, 122.2)
    details = uc("View Job Details", 311.7, 204.4)
    started = uc("View Get Started / Role Selection Page", 311.7, 274.2)
    role = uc("Choose Role: Job Seeker or Employer", 498.6, 356.5, 174.4, 72.8)
    login = uc("Login to Account", 498.6, 454.3, 174.4)
    edit = uc("Edit Personal Information", 311.7, 499.0)
    apply_ = uc("Apply to a Job", 311.7, 565.6)
    slips = uc("View My Referral Slips", 311.7, 632.8)
    create = uc("Create Job Posting", 697.8, 40.0)
    submit = uc("Submit Job for PESO Review", 697.8, 122.2)
    applicants = uc("View All Applicants", 697.8, 204.4)
    report = uc("View AI Match Report for a Job", 697.8, 274.1)
    admin_login = uc("Login to Admin Portal", 697.8, 466.0)
    approve = uc("Approve Job Posting", 697.9, 548.2)
    trigger = uc("Trigger AI Matching for a Job", 697.9, 617.9)
    gen_slip = uc("Generate PESO Referral Slip", 697.8, 687.7)
    lmi = uc("View LMI Overview", 697.8, 757.4)
    two_step = uc("Set up Two-Step Verification", 499.8, 603.0, 174.4)

    left_assoc = ASSOC + "exitX=1;exitY=0.3333;exitDx=0;exitDy=0;exitPerimeter=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;"
    right_assoc = ASSOC + "exitX=0;exitY=0.3333;exitDx=0;exitDy=0;exitPerimeter=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;"
    for t in (landing, browse, details, started):
        d.edge(guest, t, left_assoc)
    for t in (login, edit, apply_, slips):
        d.edge(seeker, t, left_assoc)
    for t in (create, submit, applicants, report, login):
        d.edge(employer, t, right_assoc)
    for t in (admin_login, approve, trigger, gen_slip, lmi):
        d.edge(admin, t, right_assoc)

    d.edge(started, role, DASHED + "exitX=1;exitY=0.5;entryX=0.5;entryY=0;", "&lt;&lt;include&gt;&gt;")
    d.edge(details, browse, DASHED + "exitX=0.5;exitY=0;entryX=0.5;entryY=1;", "&lt;&lt;extend&gt;&gt;")
    d.edge(create, submit, DASHED + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;", "&lt;&lt;include&gt;&gt;")
    d.edge(admin_login, two_step, DASHED + "exitX=0;exitY=0.5;entryX=0.5;entryY=0;", "&lt;&lt;include&gt;&gt;")
    return d


def fig09() -> Diagram:
    left = [UC("View Landing Page", [E("View Hero Section and Impact Metrics"), E("View Testimonials Section"),
                                     E("View Job Categories Section"), E("View Partner Organizations Section"),
                                     E("View How it Works Section"), E("View News and Announcement Section"),
                                     E("View PESO Services Section"), E("View Upcoming Job Fairs and Events"),
                                     E("View Skills on Demand Section"), E("Subscribe to Newsletter")])]
    right = [UC("Browse Public Job Listing", [E("Search Jobs by Keyword"), E("View Job Details")]),
             UC("View Get Started / Role Selection Page", [I("Choose Role: Job Seeker or Employer")]),
             UC("Navigate to Job Seeker Login"), UC("Navigate to Employer Login"),
             UC("Reset Password Via Email Link"), UC("View About Page"), UC("View Help / FAQ Page"),
             UC("View Privacy Policy Page")]
    return use_case_diagram("Figure 9 - Guest Users", ("Guest", "(Unauthenticated User)"), left, right)


def fig10() -> Diagram:
    left = [UC("Login to Account", [E("Reset Password")]), UC("Change Password"), UC("Delete Account"), UC("Logout"),
            UC("Edit Personal Information", [E("Update Address Details"), E("Update Employment Status"),
                                             E("Manage Education History"), E("Manage Work Experience"),
                                             E("Manage Language Proficiency"), E("Set Job Preferences"),
                                             E("Manage Other Skills"), E("Manage Training Records"),
                                             E("Manage Professional Licenses"), E("Upload Profile Photo")])]
    right = [UC("View Dashboard Overview", [E("Toggle Job-Seeking Status"), I("View Profile Completeness"),
                                            I("View Recent Application Summary"), I("View Latest Job Listings")]),
             UC("Browse Job Listings", [E("Search and Filter Jobs"), E("View Job Details")]),
             UC("Apply to a Job"), UC("Save a Job"),
             UC("View All Applications", [E("Search and Filter Applications")]),
             UC("View My Referral Slips", [E("View Referral Slip Details"), E("View Referral Slip QR Code"),
                                           E("Download Referral Slip QR Code")]),
             UC("View Notifications", [E("Read Messages"), E("Send a Message"),
                                       E("Configure Notification Preferences")])]
    return use_case_diagram("Figure 10 - Job Seeker Users", ("Job Seeker", "(Authenticated User)"), left, right)


def fig11() -> Diagram:
    left = [UC("Login to Account", [E("Reset Password")]), UC("Logout"), UC("Change Password"), UC("Delete Account"),
            UC("Manage Team Members"), UC("Set Privacy Settings"),
            UC("View Dashboard Overview", [I("View Recent Applications"), I("View Stat Summary"),
                                           I("View Recent Job Posts"), E("Navigate to Manage Jobs"),
                                           E("Navigate to Review Applications")]),
            UC("Edit Establishment Details", [E("Set Industry Codes"), E("Update Geographic Information"),
                                              E("Update Contact and SRS Footer"), E("Upload Compliance Document"),
                                              E("Upload Company Logo"), E("View SRS Readiness Score")])]
    right = [UC("Create Job Posting", [I("Submit Job for Admin Review")]), UC("Edit Job Posting"),
             UC("Archive Job Posting"), UC("Delete Job Posting"),
             UC("View Job Status", [E("Search and Filter Job Postings")]),
             UC("View All Applications", [E("Filter Applications by Source"), E("Filter Applications by Job or Status")]),
             UC("View Application Details", [E("Update Application Status"), E("Send Feedback Message to Applicant"),
                                             E("Delete Application Record")]),
             UC("View AI Match Report for a Job", [I("Browse Ranked Candidate List"), E("View Candidate Score Breakdown"),
                                                   E("View Candidate Strength and Gaps"),
                                                   E("View Biases and Constraints Violation"),
                                                   E("Message a Matched Candidate"), E("View Candidate Profile")]),
             UC("View Notifications", [E("Configure Notification Preferences")])]
    return use_case_diagram("Figure 11 - Employers", ("Employer", "(Authenticated User)"), left, right)


def fig12() -> Diagram:
    left = [UC("Login to Admin Portal"), UC("Logout"), UC("Change Password"), UC("Request Admin Account"),
            UC("Configure Admin Profile"), UC("Access Account Security Settings"),
            UC("View Admin Dashboard Overview", [I("View Top Employers by Referral Volume"),
                                                 I("View Job Status Distribution"), I("View Monthly Trend Chart"),
                                                 I("View Platform Statistics"), I("View LMI Overview")]),
            UC("View All Employers", [E("Search and Filter Employers"), E("View Employer Profile")]),
            UC("Review Employer Account", [E("Approve Employer Account"), E("Archive Employer Account"),
                                           E("Reactivate Employer Account"), E("Suspend Employer Account")]),
            UC("Create Employer Account"),
            UC("View All Job Postings", [E("Search and Filter Jobs"), E("Paginate Job Listing")]),
            UC("View Job Posting Details", [E("Approve Job Posting"), E("Reject Job Posting"), E("Archive Job Posting")])]
    right = [UC("Create Job Posting"),
             UC("View All Job Seekers", [E("Search Job Seeker"), E("Filter by Job or Status"),
                                         E("Paginate Job Seeker Records"), E("Export Job Seeker Report")]),
             UC("View Job Seeker Profile", [E("View Job Seeker Timeline"), E("Download Job Seeker CV/Resume")]),
             UC("Trigger AI Matching for a Job"),
             UC("View AI Match Report per Job", [I("View Ranked Candidate Scores"), E("View Score Breakdown")]),
             UC("View Referral Records", [E("Search and Filter Referrals"), E("Update Referral Status"),
                                          E("Delete Referral Record"), E("Export Referrals as CSV")]),
             UC("Generate PESO Referral Slip", [E("Print Referral Slip")]), UC("View Generated Referral Slips"),
             UC("View Notifications", [E("Mark Notification as Read")]), UC("Read Messages"),
             UC("Send Messages to Job Seekers and Employers"), UC("Manage System Configuration"),
             UC("View Error and Activity Reports")]
    return use_case_diagram("Figure 12 - Administrator", ("Administrator", "(Authenticated User)"), left, right)


# ---------------------------------------------------------------- Figure 13: system architecture
def fig13() -> Diagram:
    d = Diagram("Figure 13 - System Architecture")
    d.vertex("Client Tier (Web Browser)", CONTAINER, 0, 0, 900, 120)
    js = d.vertex("<b>Job Seeker Portal</b><br>/jobseeker", RBOX, 40, 40, 240, 60)
    em = d.vertex("<b>Employer Portal</b><br>/employer", RBOX, 330, 40, 240, 60)
    ad = d.vertex("<b>PESO Admin Portal</b><br>/admin", RBOX, 620, 40, 240, 60)

    d.vertex("Application Tier (Next.js + TypeScript on Vercel)", CONTAINER, 0, 170, 900, 300)
    mw = d.vertex("<b>Middleware</b><br>Session check and role-based route guard", BOX, 40, 210, 820, 50)
    ui = d.vertex("<b>App Router Pages</b><br>React UI, Tailwind CSS,<br>React Query", BOX, 40, 290, 250, 70)
    api = d.vertex("<b>API Route Handlers</b><br>/app/api: Zod validation,<br>role and ownership checks", BOX, 325, 290, 250, 70)
    pdf = d.vertex("<b>Referral Slip Service</b><br>PDF and QR code generation", BOX, 610, 290, 250, 70)
    st1 = d.vertex("<b>Stage 1 Matching Engine</b><br>Deterministic five-dimension scoring", BOX, 40, 390, 390, 60)
    st2 = d.vertex("<b>Stage 2 Explanation Service</b><br>De-identified LLM narrative (on demand)", BOX, 470, 390, 390, 60)

    d.vertex("Data Tier (Supabase)", CONTAINER, 0, 520, 900, 130)
    au = d.vertex("<b>Supabase Auth</b><br>Email/password, Google OAuth<br>(job seekers and employers)", BOX, 40, 560, 250, 70)
    pg = d.vertex("<b>PostgreSQL</b><br>Row Level Security,<br>audit_logs", BOX, 325, 560, 250, 70)
    sb = d.vertex("<b>Supabase Storage</b><br>resumes, profile-images,<br>employer-documents, job-attachments", BOX, 610, 560, 250, 70)

    d.vertex("External Services", CONTAINER, 940, 170, 230, 300)
    groq = d.vertex("<b>Groq API</b><br>LLM narrative<br>(primary + fallback model)", BOX, 960, 210, 190, 70)
    rs = d.vertex("<b>Resend</b><br>Transactional email", BOX, 960, 300, 190, 60)
    go = d.vertex("<b>Google OAuth</b><br>Identity provider", BOX, 960, 380, 190, 60)

    for c in (js, em, ad):
        d.edge(c, mw, STRAIGHT_ARROW + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;", "HTTPS")
    d.edge(mw, ui, STRAIGHT_ARROW + "exitX=0.15;exitY=1;entryX=0.5;entryY=0;")
    d.edge(mw, api, STRAIGHT_ARROW + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;")
    d.edge(api, pdf, STRAIGHT_ARROW)
    d.edge(api, st1, STRAIGHT_ARROW + "exitX=0.3;exitY=1;entryX=0.7;entryY=0;")
    d.edge(api, st2, STRAIGHT_ARROW + "exitX=0.7;exitY=1;entryX=0.3;entryY=0;")
    d.edge(api, au, ARROW + "exitX=0;exitY=0.75;entryX=0.5;entryY=0;", "", [(305, 345), (305, 500), (165, 500)])
    d.edge(st1, pg, STRAIGHT_ARROW + "exitX=0.7;exitY=1;entryX=0.3;entryY=0;", "SQL")
    d.edge(st2, pg, STRAIGHT_ARROW + "exitX=0.3;exitY=1;entryX=0.7;entryY=0;")
    d.edge(pdf, sb, STRAIGHT_ARROW + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;", "", [(735, 500)])
    d.edge(st2, groq, ARROW + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;", "de-identified fields")
    d.edge(api, rs, ARROW + "exitX=1;exitY=0.25;entryX=0;entryY=0.5;", "", [(590, 307), (590, 275), (930, 275), (930, 330)])
    d.edge(au, go, ARROW + "exitX=1;exitY=0.25;entryX=0;entryY=0.5;", "OAuth", [(310, 578), (310, 500), (920, 500), (920, 410)])
    return d


# ---------------------------------------------------------------- Figure 14: deployment
def fig14() -> Diagram:
    d = Diagram("Figure 14 - Deployment Configuration")
    dev = d.vertex("&lt;&lt;device&gt;&gt;<br><b>Client Device</b>", NODE3D, 0, 150, 200, 150)
    d.vertex("Web browser<br>(desktop or mobile)", BOX, 20, 220, 150, 50)

    ver = d.vertex("&lt;&lt;execution environment&gt;&gt;<br><b>Vercel (Production)</b>", NODE3D, 290, 60, 330, 330)
    d.vertex("Edge Middleware<br>(session and role guard)", BOX, 310, 130, 280, 50)
    d.vertex("Serverless Functions<br>(Next.js API Route Handlers,<br>matching and explanation services)", BOX, 310, 200, 280, 70)
    d.vertex("Static Assets and Pages<br>(Vercel CDN)", BOX, 310, 290, 280, 50)

    sup = d.vertex("&lt;&lt;cloud service&gt;&gt;<br><b>Supabase Project</b>", NODE3D, 710, 60, 300, 330)
    d.vertex("Supabase Auth", BOX, 730, 130, 250, 45)
    d.vertex("PostgreSQL with RLS<br>(schema via SQL migrations)", BOX, 730, 190, 250, 55)
    d.vertex("Supabase Storage (4 buckets)", BOX, 730, 260, 250, 45)

    gh = d.vertex("&lt;&lt;source control / CI&gt;&gt;<br><b>GitHub</b>", NODE3D, 290, 470, 330, 170)
    d.vertex("Repository (main branch)", BOX, 310, 535, 280, 35)
    d.vertex("GitHub Actions: ci.yml, deploy.yml,<br>e2e-tests.yml, supabase-keepalive.yml", BOX, 310, 580, 280, 45)

    ext = d.vertex("&lt;&lt;external services&gt;&gt;<br><b>Third-Party APIs</b>", NODE3D, 710, 470, 300, 170)
    d.vertex("Groq API (LLM narrative)", BOX, 730, 535, 250, 30)
    d.vertex("Resend (email)", BOX, 730, 570, 250, 30)
    d.vertex("Google OAuth", BOX, 730, 605, 250, 25)

    d.edge(dev, ver, STRAIGHT_ARROW + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;", "HTTPS")
    d.edge(ver, sup, STRAIGHT_ARROW + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;", "HTTPS / supabase-js")
    d.edge(gh, ver, STRAIGHT_ARROW + "exitX=0.5;exitY=0;entryX=0.5;entryY=1;", "vercel build / deploy --prod")
    d.edge(ver, ext, ARROW + "exitX=0.85;exitY=1;entryX=0;entryY=0.5;", "HTTPS", [(570, 555)])
    d.edge(gh, sup, ARROW + "exitX=1;exitY=0.25;entryX=0.25;entryY=1;", "keepalive ping", [(785, 512)])
    return d


# ---------------------------------------------------------------- Figure 15: context diagram
def fig15() -> Diagram:
    d = Diagram("Figure 15 - Context Diagram (Level 0 DFD)")
    p = d.vertex("<b>0</b><br>GensanWorks<br>Employment and LMI System", CIRCLE, 380, 230, 200, 200)
    guest = d.vertex("Guest", BOX, 0, 0, 150, 60)
    js = d.vertex("Job Seeker", BOX, 0, 300, 150, 60)
    em = d.vertex("Employer", BOX, 810, 0, 150, 60)
    ad = d.vertex("PESO Administrator", BOX, 810, 300, 150, 60)
    mail = d.vertex("Email Service<br>(Resend)", BOX, 220, 600, 150, 60)
    llm = d.vertex("LLM Provider<br>(Groq API)", BOX, 590, 600, 150, 60)

    d.edge(guest, p, STRAIGHT_ARROW + "exitX=1;exitY=0.5;", "registration details, search keywords")
    d.edge(p, guest, STRAIGHT_ARROW + "entryX=0.5;entryY=1;", "public job listings, landing page content")
    d.edge(js, p, STRAIGHT_ARROW + "exitX=1;exitY=0.3;", "profile data, applications, messages")
    d.edge(p, js, STRAIGHT_ARROW + "entryX=1;entryY=0.8;", "job listings, application status,\nreferral slips, notifications")
    d.edge(em, p, STRAIGHT_ARROW + "exitX=0;exitY=0.5;", "establishment profile, job postings,\napplication decisions")
    d.edge(p, em, STRAIGHT_ARROW + "entryX=0.5;entryY=1;", "applications, AI match reports, notifications")
    d.edge(ad, p, STRAIGHT_ARROW + "exitX=0;exitY=0.3;", "approvals, matching triggers,\nreferral details")
    d.edge(p, ad, STRAIGHT_ARROW + "entryX=0;entryY=0.8;", "dashboards, LMI reports,\nranked candidates")
    d.edge(p, mail, STRAIGHT_ARROW, "verification / reset emails")
    d.edge(p, llm, STRAIGHT_ARROW + "exitX=0.75;exitY=0.95;entryX=0.75;entryY=0;", "de-identified fields + scores")
    d.edge(llm, p, STRAIGHT_ARROW + "exitX=0.25;exitY=0;entryX=0.85;entryY=0.85;", "narrative (summary,\nstrengths, gaps)")
    return d


# ---------------------------------------------------------------- Figure 16: level 1 DFD
def fig16() -> Diagram:
    d = Diagram("Figure 16 - Level 1 DFD")
    R = 120
    js = d.vertex("Job Seeker", BOX, 0, 330, 140, 60)
    em = d.vertex("Employer", BOX, 1160, 330, 140, 60)
    ad = d.vertex("PESO Administrator", BOX, 580, 860, 140, 60)

    p1 = d.vertex("<b>1.0</b><br>Manage Accounts and Authentication", CIRCLE, 250, 40, R, R)
    p2 = d.vertex("<b>2.0</b><br>Manage Profiles", CIRCLE, 250, 300, R, R)
    p3 = d.vertex("<b>3.0</b><br>Manage Job Postings", CIRCLE, 930, 40, R, R)
    p4 = d.vertex("<b>4.0</b><br>Process Applications", CIRCLE, 590, 300, R, R)
    p5 = d.vertex("<b>5.0</b><br>Run AI-Assisted Matching", CIRCLE, 930, 560, R, R)
    p6 = d.vertex("<b>6.0</b><br>Manage Referrals", CIRCLE, 590, 600, R, R)
    p7 = d.vertex("<b>7.0</b><br>Messaging and Notifications", CIRCLE, 250, 560, R, R)
    p8 = d.vertex("<b>8.0</b><br>Generate LMI Reports", CIRCLE, 930, 300, R, R)

    s1 = d.vertex("<b>D1</b> | User Profiles (jobseekers, employers, admins)", STORE, 470, 70, 300, 34)
    s2 = d.vertex("<b>D2</b> | Jobs", STORE, 470, 200, 150, 34)
    s3 = d.vertex("<b>D3</b> | Applications", STORE, 720, 460, 170, 34)
    s4 = d.vertex("<b>D4</b> | Job Match Scores", STORE, 1100, 470, 180, 34)
    s5 = d.vertex("<b>D5</b> | Referrals and Referral Slips", STORE, 330, 740, 230, 34)
    s6 = d.vertex("<b>D6</b> | Messages and Notifications", STORE, 40, 760, 230, 34)
    s7 = d.vertex("<b>D7</b> | Audit Logs", STORE, 1100, 200, 170, 34)

    A = STRAIGHT_ARROW
    d.edge(js, p1, A, "credentials")
    d.edge(p1, s1, A, "account record")
    d.edge(js, p2, A, "personal, education,\nskills data")
    d.edge(p2, s1, A, "profile updates")
    d.edge(em, p3, A, "job vacancy details")
    d.edge(p3, s2, A, "job (pending)")
    d.edge(ad, p3, A + "exitX=1;exitY=0;entryX=1;entryY=0.7;", "approve / reject", [(1060, 860), (1060, 125)])
    d.edge(s2, p4, A, "active jobs")
    d.edge(js, p4, A + "exitX=1;exitY=0.7;", "application")
    d.edge(p4, s3, A, "application record")
    d.edge(p4, em, A + "exitX=1;exitY=0.5;entryX=0;entryY=0.7;", "applicants list", [(1100, 360), (1100, 372)])
    d.edge(ad, p5, A, "matching trigger")
    d.edge(s1, p5, A + "exitX=1;exitY=0.5;entryX=0.5;entryY=0;", "eligible profiles", [(880, 87), (880, 540), (990, 540)])
    d.edge(p5, s4, A, "scores and breakdown")
    d.edge(s4, em, A + "exitX=0.5;exitY=0;entryX=0.5;entryY=1;", "ranked candidates")
    d.edge(ad, p6, A, "referral details")
    d.edge(p6, s5, A, "referral + slip (QR)")
    d.edge(s5, js, A + "exitX=0;exitY=0.5;entryX=0.3;entryY=1;", "referral slip", [(42, 757)])
    d.edge(p7, s6, A, "message / notification")
    d.edge(s6, js, A + "exitX=0.3;exitY=0;entryX=0.2;entryY=1;", "notifications")
    d.edge(s3, p8, A, "application data")
    d.edge(p8, ad, A + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "LMI dashboard", [(1030, 890)])
    d.edge(p8, s7, A, "report access log")
    return d


# ---------------------------------------------------------------- Figure 17: activity diagram
def fig17() -> Diagram:
    d = Diagram("Figure 17 - Activity Diagram")
    LW, H = 300.0, 1340.0
    lane = ("swimlane;html=1;startSize=30;horizontal=1;strokeColor=#000000;fillColor=#ffffff;"
            "fontSize=12;fontStyle=1;" + FONT)
    for i, name in enumerate(("Web Display", "Web Server", "Database")):
        d.vertex(name, lane, i * LW, 0, LW, H)
    act = BOX.replace("rounded=0", "rounded=1;arcSize=40")
    W, Hh = 230.0, 50.0

    def a(lane_i: int, y: float, text: str) -> str:
        return d.vertex(text, act, lane_i * LW + (LW - W) / 2, y, W, Hh)

    start = d.vertex("", "ellipse;html=1;fillColor=#000000;strokeColor=#000000;", 135, 45, 30, 30)
    a1 = a(0, 95, "Employer submits job posting form")
    a2 = a(1, 95, "Validate input, role and ownership")
    a3 = a(2, 95, "Insert job (job_status = pending)")
    a4 = a(0, 185, "Administrator reviews pending job")
    dec = d.vertex("", "rhombus;html=1;strokeColor=#000000;fillColor=#ffffff;", 130, 265, 40, 40)
    d.vertex("Approved?", TEXT, 175, 268, 70, 30)
    r1 = d.vertex("Set job_status = rejected;<br>notify employer", act, 310, 255, 210, Hh)
    a5 = a(1, 340, "Set job_status = active")
    a6 = a(2, 340, "Update job record")
    a7 = a(0, 425, "Job seeker views job and applies")
    a8 = a(1, 425, "Validate and create application")
    a9 = a(2, 425, "Insert application (under_review)")
    a10 = a(0, 515, "Administrator triggers AI matching for the job")
    a11 = a(1, 515, "Stage 1: score eligible profiles<br>(five weighted dimensions)")
    a12 = a(2, 515, "Upsert job_match_scores")
    a13 = a(0, 605, "Administrator and employer review ranked candidates")
    a14 = a(1, 605, "Stage 2 (on demand): generate<br>de-identified explanation")
    a15 = a(2, 605, "Store summary, strengths, gaps")
    a16 = a(0, 695, "Administrator selects candidate and confirms referral")
    a17 = a(1, 695, "Create referral; generate PESO<br>referral slip with QR code")
    a18 = a(2, 695, "Insert referrals and referral_slips<br>(status = issued)")
    a19 = a(0, 785, "Job seeker views / downloads referral slip")
    a20 = a(0, 875, "Employer updates application status (hired / rejected)")
    a21 = a(1, 875, "Validate status transition;<br>notify job seeker")
    a22 = a(2, 875, "Update application and<br>referral slip status")
    end = d.vertex("", "ellipse;html=1;shape=endState;fillColor=#000000;strokeColor=#000000;", 135, 975, 30, 30)
    end2 = d.vertex("", "ellipse;html=1;shape=endState;fillColor=#000000;strokeColor=#000000;", 545, 265, 30, 30)

    E_ = STRAIGHT_ARROW
    chain = [(start, a1), (a1, a2), (a2, a3), (a4, dec), (a5, a6), (a7, a8), (a8, a9),
             (a10, a11), (a11, a12), (a13, a14), (a14, a15), (a16, a17), (a17, a18), (a19, a20),
             (a20, a21), (a21, a22)]
    for s, t in chain:
        d.edge(s, t, E_)
    d.edge(a3, a4, ARROW + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "", [(750, 210)])
    d.edge(dec, r1, E_ + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;", "[no]")
    d.edge(r1, end2, E_)
    d.edge(dec, a5, ARROW + "exitX=0.5;exitY=1;entryX=0;entryY=0.5;", "[yes]", [(150, 365)])
    d.edge(a6, a7, ARROW + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "", [(750, 410), (285, 410), (285, 450)])
    d.edge(a9, a10, ARROW + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "", [(750, 500), (285, 500), (285, 540)])
    d.edge(a12, a13, ARROW + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "", [(750, 590), (285, 590), (285, 630)])
    d.edge(a15, a16, ARROW + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "", [(750, 680), (285, 680), (285, 720)])
    d.edge(a18, a19, ARROW + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "", [(750, 770), (285, 770), (285, 810)])
    d.edge(a22, end, ARROW + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "", [(750, 990)])
    # trim lane height to content
    d.cells = [c.replace('height="1340.0"', 'height="1030.0"') for c in d.cells]
    return d


# ---------------------------------------------------------------- Figure 18: ERD (crow's foot)
def fig18() -> Diagram:
    d = Diagram("Figure 18 - Entity-Relationship Diagram")
    ent_style = ("swimlane;fontStyle=1;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;"
                 "resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;html=1;"
                 "strokeColor=#000000;fillColor=#ffffff;fontSize=11;" + FONT)
    row_style = ("text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=6;"
                 "spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;"
                 "whiteSpace=wrap;html=1;fontSize=10;" + FONT)
    W = 200.0

    def ent(name: str, x: float, y: float, attrs: list[str]) -> str:
        h = 26 + 18 * len(attrs)
        e = d.vertex(name, ent_style, x, y, W, h)
        for k, a_ in enumerate(attrs):
            d.vertex(a_, row_style, 0, 26 + 18 * k, W, 18, parent=e)
        return e

    users = ent("auth.users", 520, 0, ["<b>PK</b> id", "email", "email_confirmed_at"])
    js = ent("jobseekers", 200, 160, ["<b>PK, FK</b> id", "job_seeking_status", "employment_status",
                                       "consent_given_at", "is_active"])
    em = ent("employers", 520, 160, ["<b>PK, FK</b> id", "establishment_name", "industry_codes",
                                     "srs_status", "account_status"])
    ad = ent("admins", 840, 160, ["<b>PK, FK</b> id", "name", "role"])
    edu = ent("jobseeker_education", -150, 0, ["<b>PK</b> id", "<b>FK</b> jobseeker_id", "level", "course"])
    exp = ent("jobseeker_experience", -150, 120, ["<b>PK</b> id", "<b>FK</b> jobseeker_id", "position", "months"])
    tr = ent("jobseeker_trainings", -150, 240, ["<b>PK</b> id", "<b>FK</b> jobseeker_id", "skills_acquired"])
    lic = ent("jobseeker_licenses", -150, 345, ["<b>PK</b> id", "<b>FK</b> jobseeker_id", "license_name"])
    lng = ent("jobseeker_languages", -150, 450, ["<b>PK</b> id", "<b>FK</b> jobseeker_id", "language"])
    jobs = ent("jobs", 520, 380, ["<b>PK</b> id", "<b>FK</b> employer_id", "position_title",
                                  "job_status", "is_active", "archived"])
    app = ent("applications", 200, 400, ["<b>PK</b> id", "<b>FK</b> job_id", "<b>FK</b> applicant_id",
                                         "<b>FK</b> employer_id", "status", "source"])
    saved = ent("jobseeker_saved_jobs", 200, 600, ["<b>PK</b> id", "<b>FK</b> jobseeker_id", "<b>FK</b> job_id"])
    jms = ent("job_match_scores", 520, 600, ["<b>PK</b> id", "<b>FK</b> job_id", "<b>FK</b> jobseeker_id",
                                             "dimension_scores", "utility_score", "final_score", "grade",
                                             "strengths, gaps, summary"])
    ref = ent("referrals", 840, 380, ["<b>PK</b> id", "<b>FK</b> job_id", "<b>FK</b> jobseeker_id",
                                      "<b>FK</b> employer_id", "<b>FK</b> application_id", "status"])
    slip = ent("referral_slips", 840, 600, ["<b>PK</b> id", "<b>FK</b> referral_id", "<b>FK</b> job_id",
                                            "<b>FK</b> applicant_id", "<b>FK</b> issued_by", "status", "qr_code"])
    msg = ent("messages", 1160, 160, ["<b>PK</b> id", "sender_id", "recipient_id", "<b>FK</b> application_id",
                                      "content", "is_read"])
    ntf = ent("notifications", 1160, 340, ["<b>PK</b> id", "user_id", "type", "is_read"])
    aud = ent("audit_logs", 1160, 470, ["<b>PK</b> id", "user_id", "action", "created_at"])

    one_one = "edgeStyle=entityRelationEdgeStyle;html=1;endArrow=ERzeroToOne;startArrow=ERmandOne;strokeColor=#000000;"
    one_many = "edgeStyle=entityRelationEdgeStyle;html=1;endArrow=ERzeroToMany;startArrow=ERmandOne;strokeColor=#000000;"
    zero_many = "edgeStyle=entityRelationEdgeStyle;html=1;endArrow=ERzeroToMany;startArrow=ERzeroToOne;strokeColor=#000000;"
    orth = "edgeStyle=orthogonalEdgeStyle;"
    for t in (js, em, ad):
        d.edge(users, t, one_one.replace("entityRelationEdgeStyle", "orthogonalEdgeStyle"))
    for t in (edu, exp, tr, lic, lng):
        d.edge(js, t, one_many)
    d.edge(em, jobs, one_many.replace("entityRelationEdgeStyle;", orth))
    d.edge(jobs, app, one_many)
    d.edge(js, app, one_many.replace("entityRelationEdgeStyle;", orth))
    d.edge(js, saved, one_many.replace("entityRelationEdgeStyle;", orth + "exitX=0.15;exitY=1;entryX=0.15;entryY=0;"))
    d.edge(jobs, saved, one_many)
    d.edge(jobs, jms, one_many.replace("entityRelationEdgeStyle;", orth))
    d.edge(js, jms, zero_many.replace("entityRelationEdgeStyle;", orth + "exitX=0.85;exitY=1;entryX=0;entryY=0.3;"))
    d.edge(jobs, ref, one_many)
    d.edge(app, ref, zero_many.replace("entityRelationEdgeStyle;", orth + "exitX=0.5;exitY=1;entryX=0.5;entryY=1;"),
           "", [(300, 820), (940, 820)])
    d.edge(ref, slip, zero_many.replace("entityRelationEdgeStyle;", orth))
    d.edge(ad, slip, zero_many.replace("entityRelationEdgeStyle;", orth + "exitX=1;exitY=0.5;entryX=1;entryY=0.5;"),
           "", [(1060, 211), (1060, 680)])
    d.edge(app, msg, zero_many.replace("entityRelationEdgeStyle;", orth + "exitX=0.5;exitY=0;entryX=0.5;entryY=0;"),
           "", [(300, 140), (480, 140), (480, 130), (1260, 130)])
    return d


# ---------------------------------------------------------------- Figure 19: two-stage matching pipeline
def fig19() -> Diagram:
    d = Diagram("Figure 19 - Two-Stage Matching Pipeline")
    A = STRAIGHT_ARROW
    trig = d.vertex("<b>Trigger</b><br>Administrator selects an approved job<br>and runs AI matching", RBOX, 0, 0, 260, 70)
    inp = d.vertex("<b>Inputs</b><br>Job vacancy (skills, experience,<br>education, field, description)<br>"
                   "+ eligible job seeker profiles", BOX, 0, 110, 260, 90)
    norm = d.vertex("<b>Pre-processing</b><br>Skill normalization and synonym mapping;<br>"
                    "protected fields excluded", BOX, 0, 240, 260, 70)

    d.vertex("Stage 1: Deterministic Suitability Scoring (SO3a)", CONTAINER, 320, 0, 420, 420)
    dims = [("Skill alignment", "40%"), ("Work experience depth and domain relevance", "25%"),
            ("Vacancy-description relevance", "20%"), ("Field-of-study relevance", "10%"),
            ("Minimum education attainment", "5%")]
    dcells = []
    for k, (n, w) in enumerate(dims):
        dcells.append(d.vertex(f"{n} <b>({w})</b>", BOX, 340, 40 + k * 50, 380, 38))
    raw = d.vertex("Weighted sum = rawUtility (0 to 1)", BOX, 340, 300, 380, 36)
    sig = d.vertex("final score = &sigma;(10 &times; (rawUtility &minus; 0.40)) &times; 100", BOX, 340, 360, 380, 40)

    store = d.vertex("<b>Ranked candidate list</b><br>job_match_scores: per-dimension<br>breakdown, final score, grade",
                     BOX, 800, 110, 250, 80)
    d.vertex("Stage 2: LLM-Assisted Explanation (SO3b)", CONTAINER, 800, 230, 250, 190)
    exp_ = d.vertex("On demand per candidate:<br>de-identified narrative<br>(summary, strengths, gaps).<br>"
                    "Does not change scores.", BOX, 815, 270, 220, 100)
    hum = d.vertex("<b>Human decision</b><br>Administrator and employer review,<br>shortlist and refer. "
                   "AI output is assistance only.", RBOX, 800, 470, 250, 80)

    d.edge(trig, inp, A)
    d.edge(inp, norm, A)
    d.edge(norm, dcells[0], ARROW + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;", "", [(300, 275), (300, 59)])
    d.edge(dcells[-1], raw, A)
    d.edge(raw, sig, A)
    d.edge(sig, store, ARROW + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;", "", [(770, 380), (770, 150)])
    d.edge(store, exp_, A + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;")
    d.edge(exp_, hum, A + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;")
    return d


# ---------------------------------------------------------------- Figure 20: LLM explanation pipeline
def fig20() -> Diagram:
    d = Diagram("Figure 20 - LLM Explanation Pipeline and Safeguards")
    A = STRAIGHT_ARROW
    W = 300.0
    x = 0.0
    req = d.vertex("<b>1. Request</b><br>Reviewer opens a candidate's detail view", RBOX, x, 0, W, 55)
    fetch = d.vertex("<b>2. Load Stage 1 result</b><br>Read job_match_scores (scores are final)", BOX, x, 90, W, 55)
    deid = d.vertex("<b>3. De-identify</b><br>Remove name, email, phone, address, gender,<br>"
                    "birth date, civil status, religion, disability,<br>4Ps, OFW and TIN fields", BOX, x, 180, W, 90)
    prompt = d.vertex("<b>4. Build prompt</b><br>Whitelisted job and profile fields + scores;<br>"
                      "model may explain but never change scores", BOX, x, 305, W, 70)
    groq1 = d.vertex("<b>5a. Groq primary model</b><br>JSON response format", BOX, x, 410, W, 55)
    groq2 = d.vertex("<b>5b. Groq fallback model</b><br>if primary fails", BOX, x, 500, W, 55)
    dec = d.vertex("Narrative<br>returned?", "rhombus;whiteSpace=wrap;html=1;strokeColor=#000000;fillColor=#ffffff;"
                   "fontSize=10;" + FONT, x + 100, 590, 100, 80)
    ok = d.vertex("<b>6. Persist and display</b><br>Save summary, strengths, gaps;<br>"
                  "label as AI-assisted, not a decision", BOX, x, 710, W, 70)
    na = d.vertex("<b>Score-only response</b><br>NARRATIVE_UNAVAILABLE<br>(pilot mode: no further fallback;<br>"
                  "existing narrative not overwritten)", BOX, 380, 590, 260, 80)
    hum = d.vertex("<b>Human decision</b><br>Authorized reviewer decides;<br>override allowed", RBOX, x, 815, W, 60)

    d.vertex("Safeguards", CONTAINER, 380, 0, 260, 290)
    d.vertex("&bull; Runs only after Stage 1 scoring is complete<br>&bull; Protected characteristics never sent<br>"
             "&bull; Low temperature, JSON-only output<br>&bull; Fail-closed pilot mode (Groq only)<br>"
             "&bull; Explanations are assistance, not guarantees<br>&bull; Human keeps final hiring decision",
             TEXT.replace("align=center", "align=left") + "spacingLeft=8;", 385, 30, 250, 250)

    for s, t in ((req, fetch), (fetch, deid), (deid, prompt), (prompt, groq1), (ok, hum)):
        d.edge(s, t, A)
    d.edge(groq1, groq2, A, "failure")
    d.edge(groq2, dec, A)
    d.edge(groq1, dec, ARROW + "exitX=0;exitY=0.5;entryX=0;entryY=0.5;", "success", [(-40, 437), (-40, 630)])
    d.edge(dec, ok, A, "yes")
    d.edge(dec, na, A, "no")
    d.edge(na, hum, ARROW + "exitX=0.5;exitY=1;entryX=1;entryY=0.5;", "", [(510, 845)])
    return d


FIGURES = [
    (os.path.join("..", "..", "..", "manuscript-deliverables", "mermaid", "Figure-08-UseCase-Consolidated.drawio"), fig08),
    ("Figure-09-UseCase-Guest.drawio", fig09),
    ("Figure-10-UseCase-JobSeeker.drawio", fig10),
    ("Figure-11-UseCase-Employer.drawio", fig11),
    ("Figure-12-UseCase-Administrator.drawio", fig12),
    ("Figure-13-System-Architecture.drawio", fig13),
    ("Figure-14-Deployment.drawio", fig14),
    ("Figure-15-Context-Diagram.drawio", fig15),
    ("Figure-16-Level1-DFD.drawio", fig16),
    ("Figure-17-Activity-Vacancy-to-Referral.drawio", fig17),
    ("Figure-18-ERD.drawio", fig18),
    ("Figure-19-Two-Stage-Matching.drawio", fig19),
    ("Figure-20-LLM-Explanation.drawio", fig20),
]

if __name__ == "__main__":
    built = []
    for fname, fn in FIGURES:
        dg = fn()
        save([dg], fname)
        built.append(dg)
    save(built, "Figures-08-to-20-all-pages.drawio")
    print(f"wrote {len(FIGURES)} files + combined file to {OUT_DIR}")
