<div align="center">

# 🛡️ ElderGuard AI

### AI-Powered Elder Care, Safety & Companion System

<p>
  <b>Making aging safer, smarter, and more connected with AI.</b>
</p>

<p>
  <img src="https://img.shields.io/badge/AI-Generative%20AI-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Voice-AI-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Backend-Java-orange?style=for-the-badge&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
</p>

<p>
  <a href="https://github.com/kanishka-313/ELDERGUARD-AI">
    <img src="https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github" />
  </a>
</p>

</div>

---

## 🌟 Overview

**ElderGuard AI** is an AI-powered elder-care platform designed to help senior citizens live more safely and independently while keeping family members and caregivers connected.

The platform combines **Generative AI, Voice AI, safety monitoring, medication reminders, emergency alerts, activity tracking, appointments, and caregiver communication** into one unified system.

At the heart of the platform is **Mitra**, an AI companion designed to provide elderly users with conversational assistance and support.

---

## 🎯 Problem

As people age, several challenges can affect their safety and independence:

- Difficulty managing daily routines
- Missed medication
- Delayed emergency assistance
- Risk of falls and accidents
- Limited communication with caregivers
- Social isolation
- Difficulty using complex digital interfaces
- Language barriers

Traditional healthcare applications often focus on data collection rather than creating an **elder-friendly intelligent companion**.

---

## 💡 Our Solution

ElderGuard AI provides a simple and intelligent interface where elderly users can receive assistance through **voice and conversational interaction**, while caregivers can monitor important activities and receive alerts when attention is required.

### The platform focuses on:

> **Assist → Monitor → Detect → Alert → Connect**

---

# ✨ Key Features

## 🤖  AI Companion(Carebot)

A conversational AI companion designed specifically for elderly users.

- Natural interaction
- Voice-based assistance
- Daily routine support
- AI-powered responses
- Elder-friendly interaction

---

## 🚨 Emergency & SOS System

Provides a quick emergency mechanism for elderly users.

- SOS activation
- Emergency alerts
- Caregiver notification
- Emergency contact management
- Safety monitoring

---

## 💊 Medication Reminders

Helps elderly users maintain their medication routine.

- Medication reminders
- Reminder status
- Mark medication as taken
- Daily medication tracking

---

## ❤️ Health & Activity Monitoring

Provides an overview of important health and activity information.

- Health overview
- Recent activities
- Safety events
- Activity tracking
- Caregiver visibility

---

## 👨‍👩‍👧 Care Circle

Connects elderly users with trusted family members and caregivers.

- Emergency contacts
- Family communication
- Caregiver notifications
- Important user information

---

## 📅 Appointment & Schedule Management

Helps manage daily schedules and medical appointments.

- Doctor appointments
- Schedule management
- Routine tracking
- Appointment information

---

## 🗣️ Multilingual Voice AI

Designed with multilingual interaction in mind to improve accessibility for elderly users.

The project includes research and experimentation around:

- Speech recognition
- Multilingual voice interaction
- Tamil
- Malayalam
- Elder-focused voice assistance

---

# 🧠 AI Architecture

```text
                     ┌──────────────────────┐
                     │    ElderGuard AI      │
                     │      Frontend         │
                     │    React + Vite       │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │    Mitra AI           │
                     │   Companion Layer     │
                     └──────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        Voice Services     Safety System     Care System
              │                 │                 │
              ▼                 ▼                 ▼
       Speech / Voice       SOS / Alerts      Medication
       Multilingual         Fall Events       Appointments
                            Monitoring         Schedules
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
                     ┌──────────────────────┐
                     │    Java REST API     │
                     │       Backend        │
                     └──────────┬───────────┘
                                │
                                ▼
                     ┌──────────────────────┐
                     │       Supabase       │
                     │   Database & Auth    │
                     └──────────────────────┘
