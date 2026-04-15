## System architecture (Mermaid)

Paste this in any Mermaid renderer (GitHub, Mermaid Live, etc.).

```mermaid
flowchart LR
  %% Actors
  Parent((Parent))
  Clinician((Clinician))
  Therapist((Therapist))
  Lab((Lab))
  Admin((Admin))

  %% Frontend
  UI[React Client UI\n(dashboards, case pages)]
  APIClient[Axios API client\nclient/src/api.js]

  %% Backend
  BE[Node/Express API\n/server/src]
  Auth[Auth\nJWT + RBAC]
  Appt[Appointments]
  Child[Child + Parent profiles]
  Case[Clinician Case]
  Eval[Evaluation]
  Referral[Referral]
  TherapyPlan[Therapy Plans]
  Sessions[Session Logs]
  Assign[Home Assignments]
  Progress[Progress Controller]
  Engine[Progress Engine]
  Report[Reports + PDF]
  Screening[Screening + Reviews]
  Facial[Facial Screening]
  LabMod[Lab Requests + Reports]
  Msg[Messaging]
  Notif[Notifications]
  AdminMod[Admin moderation]

  DB[(MongoDB)]
  Files[(Uploads/Stored files)]

  %% UI entry points
  Parent --> UI
  Clinician --> UI
  Therapist --> UI
  Lab --> UI
  Admin --> UI
  UI --> APIClient --> BE

  %% Cross-cutting
  BE --> Auth
  Auth --> DB

  %% Core journeys
  %% 1) Parent books appointment → clinician approves → case
  BE --> Appt --> DB
  Appt --> Notif
  Notif --> DB
  Appt --> Files
  BE --> Child --> DB
  Appt --> Case
  BE --> Case --> DB

  %% 2) Clinician evaluation → referral
  BE --> Eval --> DB
  Eval --> Referral
  BE --> Referral --> DB
  Referral --> Notif

  %% 3) Therapist starts therapy → plan → sessions → assignments
  Referral --> TherapyPlan
  BE --> TherapyPlan --> DB
  TherapyPlan --> Sessions
  BE --> Sessions --> DB
  TherapyPlan --> Assign
  BE --> Assign --> DB
  Assign --> Files
  Assign --> Notif

  %% 4) Progress + reports
  BE --> Progress --> Engine
  Engine --> DB
  Sessions --> Engine
  Assign --> Engine
  TherapyPlan --> Engine
  Progress --> Report
  BE --> Report --> DB
  Report --> Files

  %% 5) Screening + reviews
  BE --> Screening --> DB
  Screening --> Files

  %% 6) Facial screening
  BE --> Facial --> DB
  Facial --> Files

  %% 7) Lab workflow
  Case --> LabMod
  BE --> LabMod --> DB
  LabMod --> Files
  LabMod --> Notif

  %% 8) Messaging
  Case --> Msg
  BE --> Msg --> DB
```

