🛡️ ElderGuard AI
AI-Powered Companion & Safety System for the Elderly
ElderGuard AI is an intelligent elder-care platform designed to help senior citizens live more safely and independently while keeping their families and caregivers connected through AI-powered monitoring, voice assistance, health insights, medication reminders, and emergency alerts.

🌟 Why ElderGuard AI?
As people age, living independently can become challenging. Missed medications, falls, emergencies, loneliness, and difficulty communicating with caregivers can create serious risks.
ElderGuard AI bridges this gap with an AI-powered digital companion that provides continuous assistance and keeps caregivers informed when attention is needed.
✨ Key Features
- 🤖  AI Companion(Carebot) — Voice-based AI companion for elderly users
- 🚨 SOS & Emergency Alerts — Quickly notify caregivers during emergencies
- 🩺 Fall Detection & Safety Monitoring — Detect potential falls and trigger alerts
- 💊 Medication Reminders — Reminders with medication tracking
- 👨‍👩‍👧 Care Circle — Connect elderly users with family and caregivers
- ❤️ Health Overview — Monitor important health and activity information
- 📅 Appointments & Schedules — Manage doctor appointments and daily routines
- 🗣️ Multilingual Voice AI — Support for regional-language interaction
- 🧠 AI-Powered Assistance — Intelligent responses and personalized support
- 📊 Activity Monitoring — Track recent activities and important events
🏗️ System Architecture
                    ┌─────────────────────┐
                    │   ElderGuard AI UI   │
                    │   React + Vite       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   AI Companion      │
                    │      Mitra           │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        Voice Services    Safety System    Health & Routine
              │                │                │
              ▼                ▼                ▼
        Voice AI / ASR     SOS / Alerts     Medication
        Multilingual       Fall Detection   Appointments
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Java REST API     │
                    │      Backend        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Supabase       │
                    │ Database + Services │
                    └─────────────────────┘

🛠️ Tech Stack
Frontend
- React
- Vite
- JavaScript
- CSS
Backend
- Java
- REST API
- Maven
AI & Voice
- Generative AI
- Voice AI
- Speech Recognition
- Multilingual AI
Database & Services
- Supabase
Development Tools
- Git & GitHub
- VS Code
📂 Project Structure
ELDERGUARD-AI/
│
├── backend/
│   ├── src/
│   │   └── main/
│   │       └── java/
│   ├── pom.xml
│   └── *.ipynb
│
├── public/
│
├── src/
│   ├── components/
│   ├── context/
│   ├── services/
│   ├── views/
│   ├── App.jsx
│   └── main.jsx
│
├── supabase_schema.sql
├── package.json
├── vite.config.js
├── .env.example
└── README.md

🚀 Getting Started
1. Clone the repository
git clone https://github.com/kanishka-313/ELDERGUARD-AI.git
cd ELDERGUARD-AI

2. Install frontend dependencies
npm install

3. Configure environment variables
Create a .env file using .env.example:
cp .env.example .env

Add your required API keys and Supabase configuration.
⚠️ Never commit your .env file or expose API keys publicly.

4. Start the frontend
npm run dev

5. Run the backend
Navigate to the backend:
cd backend

Then run the Java backend using Maven.
🎯 Use Cases
For elderly users
- Voice-based assistance
- Medication reminders
- Emergency assistance
- Daily routine support
- Multilingual interaction
For family members
- Safety notifications
- Activity monitoring
- Emergency alerts
- Care circle management
For caregivers
- Patient activity visibility
- Appointment management
- Alerts and notifications
- Centralized elder-care information
💡 What We Learned
Building ElderGuard AI helped us explore:
- Agentic and Generative AI
- Voice AI and multilingual interaction
- Full-stack application development
- REST API architecture
- Database integration
- Human-centered design
- AI-assisted healthcare workflows
- Real-time safety and emergency systems
🚧 Challenges
Some of the major challenges we faced were:
- Designing an intuitive interface for elderly users
- Integrating AI with real-world elder-care workflows
- Handling voice interaction and multilingual requirements
- Connecting frontend, backend, and database services
- Designing reliable emergency notification flows
- Developing the MVP within a limited timeframe
🔮 Future Scope
- Smartwatch and IoT integration
- Advanced fall detection
- Wearable health monitoring
- Personalized digital twin
- More Indian regional languages
- Predictive health insights
- Caregiver mobile application
- Advanced AI health analytics
👩‍💻 Team
ElderGuard AI
Built with ❤️ to make aging safer, smarter, and more connected.
