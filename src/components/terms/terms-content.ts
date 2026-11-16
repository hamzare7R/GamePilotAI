export type TermsLocale = "de" | "en";

export type TermsBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "group"; title: string; text?: string; items?: string[] }
  | { kind: "details"; items: { label: string; value: string }[] };

export type TermsSection = {
  id: string;
  title: string;
  blocks: TermsBlock[];
};

export type TermsContent = {
  documentTitle: string;
  switchLabel: string;
  updatedLabel: string;
  updatedAt: string;
  tocTitle: string;
  tocAriaLabel: string;
  sectionsAriaLabel: string;
  copyright: string;
  sections: TermsSection[];
};

export const termsContent: Record<TermsLocale, TermsContent> = {
  de: {
    documentTitle: "Nutzungsbedingungen",
    switchLabel: "Sprache",
    updatedLabel: "Zuletzt aktualisiert",
    updatedAt: "16. November 2026",
    tocTitle: "Inhalt",
    tocAriaLabel: "Inhaltsverzeichnis der Nutzungsbedingungen",
    sectionsAriaLabel: "Nutzungsbedingungen",
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
            text: "Diese Nutzungsbedingungen legen die Regeln und Bestimmungen fest, die deinen Zugang zur Plattform und deine Nutzung ihrer Dienste und Funktionen regeln.",
          },
          {
            kind: "paragraph",
            text: "Mit der Nutzung der Plattform erklärst du dich damit einverstanden, diese Bedingungen und unsere Datenschutzerklärung einzuhalten.",
          },
          {
            kind: "paragraph",
            text: "Wenn du mit diesen Bedingungen nicht einverstanden bist, nutze die Dienste bitte nicht.",
          },
        ],
      },
      {
        id: "section-2",
        title: "Nutzungsberechtigung",
        blocks: [
          {
            kind: "paragraph",
            text: "Der Nutzer muss nach den in seinem Land geltenden Gesetzen rechtlich berechtigt sein, die Dienste zu nutzen.",
          },
          {
            kind: "paragraph",
            text: "Wenn die Nutzung der Plattform die Zustimmung eines Elternteils oder gesetzlichen Vormunds erfordert, muss diese Zustimmung vor der Nutzung eingeholt werden.",
          },
        ],
      },
      {
        id: "section-3",
        title: "Benutzerkonto",
        blocks: [
          {
            kind: "paragraph",
            text: "Einige Funktionen von GamePilotAI können die Erstellung eines Kontos erfordern.",
          },
          { kind: "paragraph", text: "Der Nutzer ist verantwortlich für:" },
          {
            kind: "list",
            items: [
              "korrekte Angaben bei der Kontoerstellung.",
              "die Vertraulichkeit der Anmeldedaten.",
              "den Schutz seines Kontos vor unbefugter Nutzung.",
              "die Benachrichtigung, wenn er den Verdacht hat, dass sein Konto kompromittiert wurde.",
              "die Nichtnutzung der Konten anderer Personen ohne Erlaubnis.",
            ],
          },
          {
            kind: "paragraph",
            text: "Die Plattform ist berechtigt, bei einer gegen diese Bedingungen verstoßenden Nutzung geeignete Maßnahmen zu ergreifen.",
          },
        ],
      },
      {
        id: "section-4",
        title: "Nutzung der Dienste der Plattform",
        blocks: [
          {
            kind: "paragraph",
            text: "Der Nutzer kann die in GamePilotAI verfügbaren Funktionen für persönliche und rechtmäßige Zwecke nutzen.",
          },
          {
            kind: "paragraph",
            text: "Die Dienste umfassen, je nach verfügbaren Funktionen:",
          },
          {
            kind: "list",
            items: [
              "Spielanalysewerkzeuge.",
              "Empfehlungen und personalisierte Einstellungen.",
              "KI-Werkzeuge und Trainingshinweise.",
              "das Dashboard.",
              "die Funktion Mail Monitor, sofern verfügbar und aktiviert.",
            ],
          },
          {
            kind: "paragraph",
            text: "Die verfügbaren Funktionen können je nach Version der Plattform und zukünftigen Aktualisierungen variieren.",
          },
        ],
      },
      {
        id: "section-5",
        title: "Verbotene Nutzungen",
        blocks: [
          {
            kind: "paragraph",
            text: "Die Nutzung von GamePilotAI für folgende Aktivitäten ist untersagt:",
          },
          {
            kind: "list",
            items: [
              "jede rechtswidrige Tätigkeit.",
              "Versuche, die Plattform zu hacken oder ihre Dienste zu stören.",
              "unbefugter Zugriff auf Konten anderer Nutzer.",
              "Ausnutzung oder Missbrauch von Sicherheitslücken.",
              "Verbreitung von Schadsoftware oder schädlichem Code.",
              "Nutzung der Plattform in einer Weise, die andere Nutzer beeinträchtigt.",
              "Versuche, Schutzsysteme oder Zugriffsbeschränkungen zu umgehen.",
              "Nutzung der Dienste für Betrug oder Identitätstäuschung.",
            ],
          },
        ],
      },
      {
        id: "section-6",
        title: "KI und Empfehlungen",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI kann KI-Technologien einsetzen, um spielbezogene Empfehlungen und Hinweise bereitzustellen.",
          },
          { kind: "paragraph", text: "Der Nutzer erkennt an, dass:" },
          {
            kind: "list",
            items: [
              "die von der KI erzeugten Ergebnisse nicht immer korrekt sein müssen.",
              "die Empfehlungen auf den verfügbaren Informationen und den bereitgestellten Eingaben beruhen.",
              "die Ergebnisse von Nutzer zu Nutzer unterschiedlich sein können.",
              "wir keine bestimmten Ergebnisse oder Verbesserungen der Spielleistung garantieren.",
            ],
          },
          {
            kind: "paragraph",
            text: "Der Nutzer bleibt dafür verantwortlich, Informationen und Empfehlungen zu bewerten, bevor er danach handelt.",
          },
        ],
      },
      {
        id: "section-7",
        title: "Google- und Gmail-Dienste",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI kann die Möglichkeit bieten, ein Google-Konto zu verknüpfen, um bestimmte Dienste zu nutzen, einschließlich Mail Monitor.",
          },
          { kind: "paragraph", text: "Bei der Nutzung dieser Funktion:" },
          {
            kind: "list",
            items: [
              "entscheidet der Nutzer selbst über die Verknüpfung seines Kontos.",
              "werden Gmail-Daten im Rahmen der vom Nutzer erteilten Berechtigungen verarbeitet.",
              "kann der Nutzer die Verbindung über die verfügbaren Optionen aufheben.",
              "unterliegen Google-Dienste zusätzlich den eigenen Bedingungen und Richtlinien von Google.",
            ],
          },
          {
            kind: "paragraph",
            text: "Der Nutzer sollte der App keine Berechtigungen erteilen, die er nicht nutzen möchte.",
          },
        ],
      },
      {
        id: "section-8",
        title: "Geistiges Eigentum",
        blocks: [
          {
            kind: "paragraph",
            text: "Die Rechte am geistigen Eigentum in Bezug auf das Design von GamePilotAI, seine Marke, seine Softwarekomponenten und seine ursprünglichen Inhalte liegen bei den jeweiligen Rechteinhabern.",
          },
          {
            kind: "paragraph",
            text: "Kein geschützter Teil der Plattform darf ohne die erforderliche Genehmigung kopiert, weiterverbreitet oder genutzt werden, außer in gesetzlich zulässigen Fällen.",
          },
          {
            kind: "paragraph",
            text: "Diese Nutzungsbedingungen übertragen dem Nutzer kein Eigentum an der Plattform oder ihren Komponenten.",
          },
        ],
      },
      {
        id: "section-9",
        title: "Nutzerinhalte",
        blocks: [
          {
            kind: "paragraph",
            text: "Der Nutzer bleibt für die Inhalte und Informationen verantwortlich, die er bereitstellt oder in die Plattform eingibt.",
          },
          {
            kind: "paragraph",
            text: "Die bereitgestellten Inhalte dürfen keine Rechte Dritter und keine geltenden Gesetze verletzen.",
          },
          {
            kind: "paragraph",
            text: "Der Nutzer erteilt der Plattform die technisch erforderliche Erlaubnis, die von ihm bereitgestellten Informationen in dem Umfang zu verarbeiten, der zur Bereitstellung der gewählten Dienste und Funktionen erforderlich ist.",
          },
        ],
      },
      {
        id: "section-10",
        title: "Externe Dienste",
        blocks: [
          {
            kind: "paragraph",
            text: "Die Plattform kann Integrationen mit oder Links zu externen Diensten enthalten.",
          },
          {
            kind: "paragraph",
            text: "GamePilotAI hat keine vollständige Kontrolle über die Verfügbarkeit, den Inhalt oder die Nutzungsbedingungen dieser Dienste.",
          },
          {
            kind: "paragraph",
            text: "Die Nutzung externer Dienste unterliegt den Bedingungen und Richtlinien ihrer Anbieter.",
          },
        ],
      },
      {
        id: "section-11",
        title: "Verfügbarkeit der Dienste und Aktualisierungen",
        blocks: [
          {
            kind: "paragraph",
            text: "Wir bemühen uns, GamePilotAI stabil bereitzustellen, garantieren jedoch nicht, dass alle Dienste ohne Unterbrechung verfügbar sind.",
          },
          {
            kind: "paragraph",
            text: "Wir können Aktualisierungen, Wartungsarbeiten oder technische Änderungen durchführen, um die Plattform zu verbessern oder neue Funktionen hinzuzufügen.",
          },
          {
            kind: "paragraph",
            text: "Dies kann zeitweise zu einer vorübergehenden Einstellung einzelner Dienste führen.",
          },
        ],
      },
      {
        id: "section-12",
        title: "Sperrung oder Beendigung des Kontos",
        blocks: [
          {
            kind: "paragraph",
            text: "Wir können geeignete Maßnahmen ergreifen, einschließlich der Sperrung des Zugangs zu bestimmten Diensten oder Konten, wenn ein Verstoß gegen diese Bedingungen oder eine unrechtmäßige Nutzung der Plattform vorliegt.",
          },
          {
            kind: "paragraph",
            text: "Der Nutzer kann die Nutzung der Dienste jederzeit beenden.",
          },
          {
            kind: "paragraph",
            text: "Mit dem Konto verbundene Daten werden gemäß der Datenschutzerklärung und den geltenden rechtlichen Anforderungen verarbeitet.",
          },
        ],
      },
      {
        id: "section-13",
        title: "Haftungsbeschränkung",
        blocks: [
          {
            kind: "paragraph",
            text: "Die Dienste werden in ihrem aktuellen Zustand und nach ihrer aktuellen Verfügbarkeit bereitgestellt.",
          },
          {
            kind: "paragraph",
            text: "Soweit gesetzlich zulässig, garantieren wir nicht, dass alle Informationen, Empfehlungen oder Ergebnisse fehlerfrei oder ohne Unterbrechung verfügbar sind.",
          },
          {
            kind: "paragraph",
            text: "GamePilotAI übernimmt keine Haftung für Schäden, deren Haftung gesetzlich nicht ausgeschlossen werden kann.",
          },
          {
            kind: "paragraph",
            text: "Diese Bedingungen schränken die zwingenden gesetzlichen Rechte des Nutzers nicht ein.",
          },
        ],
      },
      {
        id: "section-14",
        title: "Änderungen der Nutzungsbedingungen",
        blocks: [
          {
            kind: "paragraph",
            text: "Wir können die Nutzungsbedingungen von Zeit zu Zeit aktualisieren, um technischen, betrieblichen oder rechtlichen Änderungen Rechnung zu tragen.",
          },
          {
            kind: "paragraph",
            text: "Die aktualisierte Version wird auf dieser Seite veröffentlicht und das Datum der letzten Aktualisierung angepasst.",
          },
          {
            kind: "paragraph",
            text: "Die weitere Nutzung der Dienste nach Inkrafttreten der Änderungen unterliegt den gesetzlichen Bestimmungen zur Benachrichtigung und Zustimmung des Nutzers.",
          },
        ],
      },
      {
        id: "section-15",
        title: "Anwendbares Recht",
        blocks: [
          {
            kind: "paragraph",
            text: "Diese Nutzungsbedingungen unterliegen den geltenden Gesetzen in [das zuständige Land bzw. die zuständige Gerichtsbarkeit wird nach rechtlicher Prüfung festgelegt].",
          },
          {
            kind: "paragraph",
            text: "Diese Bedingungen beeinträchtigen nicht die zwingenden Rechte, die dem Nutzer nach geltendem Recht zustehen.",
          },
        ],
      },
      {
        id: "section-16",
        title: "Kontakt",
        blocks: [
          {
            kind: "paragraph",
            text: "Wenn du Fragen oder Anliegen zu diesen Nutzungsbedingungen hast, kannst du uns kontaktieren über:",
          },
          {
            kind: "details",
            items: [
              { label: "Plattformname", value: "GamePilotAI" },
              { label: "Website", value: "https://gamepilot-ai-nu.vercel.app/" },
              { label: "E-Mail", value: "[contact.7r.hamza@gmail.com]" },
            ],
          },
        ],
      },
    ],
  },
  en: {
    documentTitle: "Terms of Service",
    switchLabel: "Language",
    updatedLabel: "Last updated",
    updatedAt: "November 16, 2026",
    tocTitle: "Contents",
    tocAriaLabel: "Terms of service table of contents",
    sectionsAriaLabel: "Terms of service",
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
            text: "These Terms of Service set out the rules and provisions governing your access to the platform and your use of its services and features.",
          },
          {
            kind: "paragraph",
            text: "By using the platform, you agree to comply with these terms and our Privacy Policy.",
          },
          {
            kind: "paragraph",
            text: "If you do not agree with these terms, please do not use the services.",
          },
        ],
      },
      {
        id: "section-2",
        title: "Eligibility",
        blocks: [
          {
            kind: "paragraph",
            text: "The user must be legally eligible to use the services under the laws applicable in their country.",
          },
          {
            kind: "paragraph",
            text: "If use of the platform requires the consent of a parent or legal guardian, that consent must be obtained before use.",
          },
        ],
      },
      {
        id: "section-3",
        title: "User Account",
        blocks: [
          {
            kind: "paragraph",
            text: "Some GamePilotAI features may require creating an account.",
          },
          { kind: "paragraph", text: "The user is responsible for:" },
          {
            kind: "list",
            items: [
              "providing accurate information when creating the account.",
              "keeping login credentials confidential.",
              "protecting their account from unauthorized use.",
              "notifying us if they suspect their account has been compromised.",
              "not using other people's accounts without permission.",
            ],
          },
          {
            kind: "paragraph",
            text: "The platform may take appropriate action when it detects use that violates these terms.",
          },
        ],
      },
      {
        id: "section-4",
        title: "Use of Platform Services",
        blocks: [
          {
            kind: "paragraph",
            text: "The user may use the features available in GamePilotAI for personal and lawful purposes.",
          },
          {
            kind: "paragraph",
            text: "The services include, depending on the features available:",
          },
          {
            kind: "list",
            items: [
              "game analysis tools.",
              "recommendations and personalized settings.",
              "AI tools and coaching guidance.",
              "the dashboard.",
              "the Mail Monitor feature when available and enabled.",
            ],
          },
          {
            kind: "paragraph",
            text: "Available features may vary depending on the platform version and future updates.",
          },
        ],
      },
      {
        id: "section-5",
        title: "Prohibited Uses",
        blocks: [
          { kind: "paragraph", text: "Using GamePilotAI for the following activities is prohibited:" },
          {
            kind: "list",
            items: [
              "any unlawful activity.",
              "attempting to hack the platform or disrupt its services.",
              "unauthorized access to other users' accounts.",
              "exploiting or misusing security vulnerabilities.",
              "distributing malicious software or destructive code.",
              "using the platform in a way that negatively affects other users.",
              "attempting to bypass protection systems or access restrictions.",
              "using the services for fraud or identity impersonation.",
            ],
          },
        ],
      },
      {
        id: "section-6",
        title: "AI and Recommendations",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI may use AI technologies to provide game-related recommendations and guidance.",
          },
          { kind: "paragraph", text: "The user acknowledges that:" },
          {
            kind: "list",
            items: [
              "output generated by AI may not always be accurate.",
              "recommendations depend on the available information and the inputs provided.",
              "results may differ from user to user.",
              "we do not guarantee specific results or improvements in game performance.",
            ],
          },
          {
            kind: "paragraph",
            text: "The user remains responsible for evaluating information and recommendations before acting on them.",
          },
        ],
      },
      {
        id: "section-7",
        title: "Google and Gmail Services",
        blocks: [
          {
            kind: "paragraph",
            text: "GamePilotAI may offer the ability to link a Google account to use certain services, including Mail Monitor.",
          },
          { kind: "paragraph", text: "When using this feature:" },
          {
            kind: "list",
            items: [
              "the user chooses to link their account themselves.",
              "Gmail data is processed within the permissions the user grants.",
              "the user can disconnect through the available options.",
              "Google services are also subject to Google's own terms and policies.",
            ],
          },
          {
            kind: "paragraph",
            text: "The user should not grant the app permissions they do not wish to use.",
          },
        ],
      },
      {
        id: "section-8",
        title: "Intellectual Property",
        blocks: [
          {
            kind: "paragraph",
            text: "Intellectual property rights relating to GamePilotAI's design, trademark, software components and original content belong to the respective rights holders.",
          },
          {
            kind: "paragraph",
            text: "No protected part of the platform may be copied, redistributed or exploited without the required permission, except in cases permitted by law.",
          },
          {
            kind: "paragraph",
            text: "These Terms of Service do not grant the user ownership of the platform or its components.",
          },
        ],
      },
      {
        id: "section-9",
        title: "User Content",
        blocks: [
          {
            kind: "paragraph",
            text: "The user remains responsible for the content and information they provide or enter into the platform.",
          },
          {
            kind: "paragraph",
            text: "The provided content must not infringe the rights of others or applicable laws.",
          },
          {
            kind: "paragraph",
            text: "The user grants the platform the technical permission needed to process the information they provide to the extent required to deliver the services and features they choose to use.",
          },
        ],
      },
      {
        id: "section-10",
        title: "External Services",
        blocks: [
          {
            kind: "paragraph",
            text: "The platform may include integrations with or links to external services.",
          },
          {
            kind: "paragraph",
            text: "GamePilotAI does not fully control the availability, content or terms of use of these services.",
          },
          {
            kind: "paragraph",
            text: "Use of external services is subject to their providers' terms and policies.",
          },
        ],
      },
      {
        id: "section-11",
        title: "Service Availability and Updates",
        blocks: [
          {
            kind: "paragraph",
            text: "We strive to provide GamePilotAI reliably, but we do not guarantee that all services will be available without interruption.",
          },
          {
            kind: "paragraph",
            text: "We may perform updates, maintenance or technical changes to improve the platform or add new features.",
          },
          {
            kind: "paragraph",
            text: "This may occasionally result in a temporary suspension of some services.",
          },
        ],
      },
      {
        id: "section-12",
        title: "Account Suspension or Termination",
        blocks: [
          {
            kind: "paragraph",
            text: "We may take appropriate action, including suspending access to certain services or accounts, where there is a violation of these terms or unlawful use of the platform.",
          },
          {
            kind: "paragraph",
            text: "The user may stop using the services at any time.",
          },
          {
            kind: "paragraph",
            text: "Data associated with the account is processed in accordance with the Privacy Policy and applicable legal requirements.",
          },
        ],
      },
      {
        id: "section-13",
        title: "Limitation of Liability",
        blocks: [
          {
            kind: "paragraph",
            text: "The services are provided in their current condition and availability.",
          },
          {
            kind: "paragraph",
            text: "To the extent permitted by law, we do not guarantee that all information, recommendations or results are free of errors or available without interruption.",
          },
          {
            kind: "paragraph",
            text: "GamePilotAI accepts no liability for damages for which liability cannot legally be excluded.",
          },
          {
            kind: "paragraph",
            text: "These terms do not limit the mandatory legal rights the user holds.",
          },
        ],
      },
      {
        id: "section-14",
        title: "Changes to the Terms of Service",
        blocks: [
          {
            kind: "paragraph",
            text: "We may update the Terms of Service from time to time to keep pace with technical, operational or legal changes.",
          },
          {
            kind: "paragraph",
            text: "The updated version will be published on this page and the last updated date will be revised.",
          },
          {
            kind: "paragraph",
            text: "Continued use of the services after the changes take effect is subject to the legal provisions governing user notification and consent.",
          },
        ],
      },
      {
        id: "section-15",
        title: "Governing Law",
        blocks: [
          {
            kind: "paragraph",
            text: "These Terms of Service are governed by the laws applicable in [the appropriate country or jurisdiction to be determined after legal review].",
          },
          {
            kind: "paragraph",
            text: "These terms do not affect the mandatory rights the user holds under applicable law.",
          },
        ],
      },
      {
        id: "section-16",
        title: "Contact Us",
        blocks: [
          {
            kind: "paragraph",
            text: "If you have questions or inquiries regarding these Terms of Service, you can contact us via:",
          },
          {
            kind: "details",
            items: [
              { label: "Platform name", value: "GamePilotAI" },
              { label: "Website", value: "https://gamepilot-ai-nu.vercel.app/" },
              { label: "Email", value: "[contact.7r.hamza@gmail.com]" },
            ],
          },
        ],
      },
    ],
  },
};
