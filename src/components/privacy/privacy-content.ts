export type PrivacyLocale = "de" | "en";

export type PrivacyBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "group"; title: string; text?: string; items?: string[] }
  | { kind: "details"; items: { label: string; value: string }[] };

export type PrivacySection = {
  id: string;
  title: string;
  blocks: PrivacyBlock[];
};

export type PrivacyContent = {
  documentTitle: string;
  switchLabel: string;
  updatedLabel: string;
  updatedAt: string;
  tocTitle: string;
  tocAriaLabel: string;
  sectionsAriaLabel: string;
  copyright: string;
  sections: PrivacySection[];
};

export const privacyContent: Record<PrivacyLocale, PrivacyContent> = {
  de: {
    documentTitle: "Datenschutzerklärung",
    switchLabel: "Sprache",
    updatedLabel: "Zuletzt aktualisiert",
    updatedAt: "16. November 2026",
    tocTitle: "Inhalt",
    tocAriaLabel: "Inhaltsverzeichnis der Datenschutzerklärung",
    sectionsAriaLabel: "Datenschutzerklärung",
    copyright: "© GamePilotAI – Alle Rechte vorbehalten.",
    sections: [
      {
        id: "section-1",
        title: "Einleitung",
        blocks: [
          { kind: "paragraph", text: "Willkommen bei GamePilotAI." },
          {
            kind: "paragraph",
            text: "GamePilotAI ist dein persönlicher Gaming-Begleiter. Ziel ist es, deinen Spielverlauf in intelligentere Setups, maßgeschneiderte Trainingshinweise und bessere Spielerlebnisse zu verwandeln.",
          },
          {
            kind: "paragraph",
            text: "Wir respektieren deine Privatsphäre und setzen uns für den Schutz deiner personenbezogenen Daten ein. Diese Richtlinie erläutert, wie wir deine Daten erheben, verwenden, verarbeiten und speichern, wenn du unsere Plattform und unsere Dienste nutzt.",
          },
        ],
      },
      {
        id: "section-2",
        title: "Welche Informationen wir sammeln",
        blocks: [
          {
            kind: "paragraph",
            text: "Wir können verschiedene Arten von Informationen erheben oder verarbeiten, darunter:",
          },
          {
            kind: "group",
            title: "a. Kontoinformationen",
            items: [
              "Name oder Benutzername.",
              "E-Mail-Adresse.",
              "Anmelde- und Authentifizierungsinformationen.",
            ],
          },
          {
            kind: "group",
            title: "b. Nutzungsinformationen",
            items: [
              "Funktionen und Dienste, die du nutzt.",
              "Interaktionen mit den Werkzeugen der Plattform.",
              "Geräte- und Browserinformationen.",
              "Fehlerprotokolle und technische Informationen.",
            ],
          },
          {
            kind: "group",
            title: "c. Spielinformationen",
            items: [
              "Spieldaten, die du eingibst oder mit der Plattform verknüpfst.",
              "Spielverlauf und verfügbare Statistiken.",
              "Einstellungen und Präferenzen, die du wählst.",
              "Informationen, die für personalisierte Empfehlungen und Hinweise erforderlich sind.",
            ],
          },
          {
            kind: "group",
            title: "d. Google- und Gmail-Informationen",
            text: "Wenn du dich entscheidest, dein Google-Konto zu verknüpfen, können bestimmte Daten gemäß den Berechtigungen verarbeitet werden, die du der App erteilst.",
          },
        ],
      },
      {
        id: "section-3",
        title: "Wie wir Informationen verwenden",
        blocks: [
          { kind: "paragraph", text: "Wir verwenden die Informationen für folgende Zwecke:" },
          {
            kind: "list",
            items: [
              "Erstellung und Verwaltung von Benutzerkonten.",
              "Bereitstellung der Dienste und Funktionen von GamePilotAI.",
              "Personalisierung des Spielerlebnisses und der Empfehlungen.",
              "Betrieb der KI-Werkzeuge und Trainingshinweise.",
              "Analyse und Verbesserung der Leistung unserer Dienste.",
              "Erkennung von Fehlern und technischen Problemen.",
              "Schutz der Plattform und der Nutzer vor unbefugten Aktivitäten.",
            ],
          },
        ],
      },
      {
        id: "section-4",
        title: "Gmail-Integration – Mail Monitor",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI bietet die Funktion Mail Monitor, mit der Nutzer ihr Gmail-Konto verknüpfen können, um bestimmte Metadaten von E-Mails zu überwachen.",
          },
          {
            kind: "paragraph",
            text: "In der aktuellen Version werden begrenzte Informationen verarbeitet, zum Beispiel:",
          },
          {
            kind: "list",
            items: [
              "die E-Mail-Adresse des Absenders.",
              "Datum und Uhrzeit der Nachricht.",
              "die Nachrichten-ID.",
              "einige verfügbare Labels und Metadaten.",
            ],
          },
          {
            kind: "paragraph",
            text: "Die Funktion verwendet die von Google erteilte Gmail-Metadata-Berechtigung.",
          },
          {
            kind: "paragraph",
            text: "Wir bestätigen, dass die aktuelle Version weder den Inhalt von Gmail-Nachrichten noch deren Betreffzeilen liest und keine Sicherheitsbestätigungscodes (OTP), Passwörter oder Links zur Kontowiederherstellung extrahiert.",
          },
          {
            kind: "paragraph",
            text: "Gmail-Daten werden ausschließlich im Rahmen der Berechtigungen verarbeitet, die der Nutzer der App erteilt.",
          },
        ],
      },
      {
        id: "section-5",
        title: "Datenspeicherung und -sicherheit",
        blocks: [
          {
            kind: "paragraph",
            text: "Wir ergreifen technische und organisatorische Maßnahmen, um personenbezogene Daten vor unbefugtem Zugriff, Veränderung, Offenlegung oder Zerstörung zu schützen.",
          },
          {
            kind: "paragraph",
            text: "Zu diesen Maßnahmen gehören Schutzmechanismen für Konten und Datenbanken sowie Verfahren zur Verschlüsselung sensibler Daten, je nach Art der Daten und der genutzten Dienste.",
          },
          {
            kind: "paragraph",
            text: "Ein absoluter Schutz jedes internetfähigen Systems kann jedoch nicht garantiert werden.",
          },
        ],
      },
      {
        id: "section-6",
        title: "Weitergabe von Informationen an Dritte",
        blocks: [
          {
            kind: "paragraph",
            text: "Einige Dienste von GamePilotAI können auf externe Dienstleister angewiesen sein, um die Plattform zu betreiben, zum Beispiel:",
          },
          {
            kind: "list",
            items: [
              "Hosting- und Infrastrukturdienste.",
              "Datenbankdienste.",
              "Google-Dienste und die Integration mit ihnen.",
              "technische Dienste, die für den Betrieb bestimmter Funktionen erforderlich sind.",
            ],
          },
          {
            kind: "paragraph",
            text: "Die für die Bereitstellung der angeforderten Dienste erforderlichen Informationen können bei diesen Stellen verarbeitet werden.",
          },
        ],
      },
      {
        id: "section-7",
        title: "KI und Datenverarbeitung",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI kann KI-Technologien einsetzen, um die vom Nutzer bereitgestellten Informationen zu analysieren und personalisierte Empfehlungen und Hinweise zu erstellen.",
          },
          {
            kind: "paragraph",
            text: "Die für diese Funktionen erforderlichen Informationen werden entsprechend der Art der genutzten Funktion verarbeitet.",
          },
        ],
      },
      {
        id: "section-8",
        title: "Datenaufbewahrung und -löschung",
        blocks: [
          {
            kind: "paragraph",
            text: "Wir bewahren Daten so lange auf, wie es für die Bereitstellung der Dienste und die Erreichung der in dieser Richtlinie beschriebenen Zwecke erforderlich ist, unter Berücksichtigung der geltenden rechtlichen Anforderungen.",
          },
          {
            kind: "paragraph",
            text: "Nutzer können uns kontaktieren, um einen Antrag auf Löschung ihres Kontos oder ihrer personenbezogenen Daten zu stellen.",
          },
        ],
      },
      {
        id: "section-9",
        title: "Nutzerrechte",
        blocks: [
          {
            kind: "paragraph",
            text: "Nach den geltenden Gesetzen können Nutzer das Recht haben:",
          },
          {
            kind: "list",
            items: [
              "Auskunft über ihre personenbezogenen Daten zu verlangen.",
              "die Berichtigung unrichtiger Informationen zu verlangen.",
              "die Löschung ihrer personenbezogenen Daten zu verlangen.",
              "eine erteilte Einwilligung zur Verarbeitung bestimmter Daten zu widerrufen, soweit dies möglich ist.",
              "die Verknüpfung ihres Google-Kontos aufzuheben.",
              "Auskunft darüber zu verlangen, wie ihre Informationen verwendet werden.",
            ],
          },
        ],
      },
      {
        id: "section-10",
        title: "Externe Dienste und Links",
        blocks: [
          {
            kind: "paragraph",
            text: "Die Plattform kann Links zu oder Integrationen mit externen Diensten enthalten.",
          },
          {
            kind: "paragraph",
            text: "Diese Dienste unterliegen den Datenschutzrichtlinien und Nutzungsbedingungen ihrer Anbieter. GamePilotAI hat keine vollständige Kontrolle über deren Datenschutzpraktiken.",
          },
        ],
      },
      {
        id: "section-11",
        title: "Privatsphäre von Kindern",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI richtet sich nicht an Kinder unter dem gesetzlich erforderlichen Mindestalter für die Nutzung der Dienste.",
          },
          {
            kind: "paragraph",
            text: "Stellen wir fest, dass personenbezogene Daten eines Kindes ohne die gesetzlich erforderlichen Einwilligungen erhoben wurden, ergreifen wir geeignete Maßnahmen, um dies zu behandeln.",
          },
        ],
      },
      {
        id: "section-12",
        title: "Änderungen dieser Datenschutzrichtlinie",
        blocks: [
          {
            kind: "paragraph",
            text: "Wir können diese Datenschutzrichtlinie von Zeit zu Zeit aktualisieren, um technischen Entwicklungen Rechnung zu tragen, neue Funktionen aufzunehmen oder rechtliche Anforderungen zu erfüllen.",
          },
          {
            kind: "paragraph",
            text: "Die aktualisierte Version wird auf dieser Seite veröffentlicht und das Datum der letzten Aktualisierung wird angepasst.",
          },
        ],
      },
      {
        id: "section-13",
        title: "Kontakt",
        blocks: [
          {
            kind: "paragraph",
            text: "Wenn du Fragen, Anliegen oder Anträge zu deiner Privatsphäre oder deinen personenbezogenen Daten hast, kannst du uns kontaktieren über:",
          },
          {
            kind: "details",
            items: [
              { label: "Plattformname", value: "GamePilotAI" },
              { label: "Website", value: "https://gamepilot-ai-nu.vercel.app/" },
              { label: "E-Mail", value: "[Kontakt-E-Mail wird noch ergänzt]" },
            ],
          },
        ],
      },
    ],
  },
  en: {
    documentTitle: "Privacy Policy",
    switchLabel: "Language",
    updatedLabel: "Last updated",
    updatedAt: "November 16, 2026",
    tocTitle: "Contents",
    tocAriaLabel: "Privacy policy table of contents",
    sectionsAriaLabel: "Privacy policy",
    copyright: "© GamePilotAI – All rights reserved.",
    sections: [
      {
        id: "section-1",
        title: "Introduction",
        blocks: [
          { kind: "paragraph", text: "Welcome to GamePilotAI." },
          {
            kind: "paragraph",
            text: "GamePilotAI is your personal gaming companion. It aims to turn your play history into smarter setups, tailored coaching guidance and better gaming experiences.",
          },
          {
            kind: "paragraph",
            text: "We respect your privacy and work to protect your personal information. This policy explains how we collect, use, process and store your data when you use our platform and services.",
          },
        ],
      },
      {
        id: "section-2",
        title: "Information We Collect",
        blocks: [
          {
            kind: "paragraph",
            text: "We may collect or process different types of information, including:",
          },
          {
            kind: "group",
            title: "a. Account information",
            items: ["Name or username.", "Email address.", "Login and authentication information."],
          },
          {
            kind: "group",
            title: "b. Usage information",
            items: [
              "Features and services you use.",
              "Interactions with the platform's tools.",
              "Device and browser information.",
              "Error logs and technical information.",
            ],
          },
          {
            kind: "group",
            title: "c. Game information",
            items: [
              "Game data you enter or link to the platform.",
              "Play history and available statistics.",
              "Preferences and settings you choose.",
              "Information needed to provide personalized recommendations and guidance.",
            ],
          },
          {
            kind: "group",
            title: "d. Google and Gmail information",
            text: "If you choose to link your Google account, some data may be processed in accordance with the permissions you grant to the app.",
          },
        ],
      },
      {
        id: "section-3",
        title: "How We Use Information",
        blocks: [
          { kind: "paragraph", text: "We use information for the following purposes:" },
          {
            kind: "list",
            items: [
              "Creating and managing user accounts.",
              "Providing GamePilotAI's services and features.",
              "Personalizing the gaming experience and recommendations.",
              "Operating AI tools and coaching guidance.",
              "Analyzing and improving service performance.",
              "Detecting errors and technical issues.",
              "Protecting the platform and users from unauthorized activity.",
            ],
          },
        ],
      },
      {
        id: "section-4",
        title: "Gmail Integration – Mail Monitor",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI offers a Mail Monitor feature that lets users link their Gmail account to monitor certain email metadata.",
          },
          {
            kind: "paragraph",
            text: "In the current version, limited information is processed, such as:",
          },
          {
            kind: "list",
            items: [
              "the sender's email address.",
              "the date and time of the message.",
              "the message ID.",
              "some available labels and metadata.",
            ],
          },
          {
            kind: "paragraph",
            text: "The feature uses the Gmail Metadata permission granted by Google.",
          },
          {
            kind: "paragraph",
            text: "We confirm that the current version does not read the content of Gmail messages or their subject lines, and does not extract security verification codes (OTP), passwords or account recovery links.",
          },
          {
            kind: "paragraph",
            text: "Gmail data is processed only within the permissions the user grants to the app.",
          },
        ],
      },
      {
        id: "section-5",
        title: "Data Storage and Security",
        blocks: [
          {
            kind: "paragraph",
            text: "We take technical and organizational measures aimed at protecting personal information from unauthorized access, alteration, disclosure or destruction.",
          },
          {
            kind: "paragraph",
            text: "These measures include account and database protection mechanisms, as well as encryption of sensitive data according to the nature of the data and the services used.",
          },
          {
            kind: "paragraph",
            text: "However, absolute security of any internet-connected system cannot be guaranteed.",
          },
        ],
      },
      {
        id: "section-6",
        title: "Sharing Information with Third Parties",
        blocks: [
          {
            kind: "paragraph",
            text: "Some GamePilotAI services may rely on external service providers to operate the platform, such as:",
          },
          {
            kind: "list",
            items: [
              "Hosting and infrastructure services.",
              "Database services.",
              "Google services and integration with them.",
              "technical services needed to operate certain features.",
            ],
          },
          {
            kind: "paragraph",
            text: "Information necessary to provide the requested services may be processed by these parties.",
          },
        ],
      },
      {
        id: "section-7",
        title: "AI and Data Processing",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI may use AI technologies to analyze the information users provide and generate personalized recommendations and guidance.",
          },
          {
            kind: "paragraph",
            text: "The information needed to provide these functions is processed according to the nature of the feature used.",
          },
        ],
      },
      {
        id: "section-8",
        title: "Data Retention and Deletion",
        blocks: [
          {
            kind: "paragraph",
            text: "We retain data for as long as necessary to provide the services and achieve the purposes described in this policy, taking applicable legal requirements into account.",
          },
          {
            kind: "paragraph",
            text: "Users can contact us to submit a request regarding the deletion of their account or personal data.",
          },
        ],
      },
      {
        id: "section-9",
        title: "User Rights",
        blocks: [
          {
            kind: "paragraph",
            text: "Under applicable laws, users may have the right to:",
          },
          {
            kind: "list",
            items: [
              "Request access to their personal data.",
              "Request correction of inaccurate information.",
              "Request deletion of their personal data.",
              "Withdraw consent for the processing of certain data where possible.",
              "Unlink their Google account.",
              "Ask how their information is used.",
            ],
          },
        ],
      },
      {
        id: "section-10",
        title: "External Services and Links",
        blocks: [
          {
            kind: "paragraph",
            text: "The platform may contain links to or integrations with external services.",
          },
          {
            kind: "paragraph",
            text: "These services are subject to their providers' privacy policies and terms of use, and GamePilotAI does not fully control their privacy practices.",
          },
        ],
      },
      {
        id: "section-11",
        title: "Children's Privacy",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI is not aimed at children below the legal age required to use its services.",
          },
          {
            kind: "paragraph",
            text: "If we learn that personal information has been collected from a child without the legally required consents, we will take appropriate steps to address it.",
          },
        ],
      },
      {
        id: "section-12",
        title: "Changes to This Privacy Policy",
        blocks: [
          {
            kind: "paragraph",
            text: "We may update this privacy policy from time to time to keep pace with technical developments, add new features or meet legal requirements.",
          },
          {
            kind: "paragraph",
            text: "The updated version will be published on this page and the last updated date will be revised.",
          },
        ],
      },
      {
        id: "section-13",
        title: "Contact Us",
        blocks: [
          {
            kind: "paragraph",
            text: "If you have questions, inquiries or requests regarding your privacy or personal data, you can contact us via:",
          },
          {
            kind: "details",
            items: [
              { label: "Platform name", value: "GamePilotAI" },
              { label: "Website", value: "https://gamepilot-ai-nu.vercel.app/" },
              { label: "Email", value: "[Contact email to be added]" },
            ],
          },
        ],
      },
    ],
  },
};
