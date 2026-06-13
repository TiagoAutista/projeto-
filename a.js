corporate-playwright-ecosystem/
│
├── playwright.config.ts
├── .env.example
├── package.json
├── tsconfig.json
│
├── tests/
│   ├── zeus/
│   │   ├── smoke/
│   │   │   └── zeus-smoke.spec.ts
│   │   └── functional/
│   │       ├── zeus-dashboard.spec.ts
│   │       ├── zeus-reports.spec.ts
│   │       └── zeus-alerts.spec.ts
│   ├── wfm/
│   │   ├── smoke/
│   │   └── functional/
│   ├── nice/
│   ├── goi/
│   ├── dm/
│   ├── sdu/
│   ├── wisetool/
│   ├── magictool/
│   ├── sagres/
│   ├── safira/
│   ├── wde/
│   ├── sielbel/
│   ├── next/
│   └── cross-system/
│       └── sso-flow.spec.ts
│
├── pages/
│   ├── base/
│   │   ├── base-auth.page.ts
│   │   ├── base-dashboard.page.ts
│   │   └── base-modal.page.ts
│   │
│   ├── zeus/
│   │   ├── zeus-login.page.ts
│   │   ├── zeus-dashboard.page.ts
│   │   ├── zeus-reports.page.ts
│   │   ├── zeus-alerts.page.ts
│   │   ├── zeus-settings.page.ts
│   │   └── components/
│   │       ├── zeus-header.component.ts
│   │       ├── zeus-sidebar.component.ts
│   │       └── zeus-notification-center.component.ts
│   │
│   ├── wfm/
│   │   ├── wfm-login.page.ts
│   │   ├── wfm-dashboard.page.ts
│   │   ├── wfm-search.page.ts
│   │   ├── wfm-queue-management.page.ts
│   │   ├── wfm-schedule.page.ts
│   │   ├── wfm-agent-monitoring.page.ts
│   │   └── components/
│   │       ├── wfm-filter-panel.component.ts
│   │       ├── wfm-data-table.component.ts
│   │       └── wfm-calendar.component.ts
│   │
│   ├── nice/
│   │   ├── nice-login.page.ts
│   │   ├── nice-dashboard.page.ts
│   │   ├── nice-workforce-management.page.ts
│   │   ├── nice-scheduling.page.ts
│   │   ├── nice-forecasting.page.ts
│   │   ├── nice-real-time-adherence.page.ts
│   │   └── components/
│   │       ├── nice-agent-status.component.ts
│   │       ├── nice-schedule-grid.component.ts
│   │       └── nice-adherence-chart.component.ts
│   │
│   ├── goi/
│   │   ├── goi-login.page.ts
│   │   ├── goi-dashboard.page.ts
│   │   ├── goi-incident-management.page.ts
│   │   ├── goi-ticket-creation.page.ts
│   │   ├── goi-ticket-search.page.ts
│   │   ├── goi-knowledge-base.page.ts
│   │   └── components/
│   │       ├── goi-ticket-form.component.ts
│   │       ├── goi-status-timeline.component.ts
│   │       └── goi-attachment-uploader.component.ts
│   │
│   ├── dm/
│   │   ├── dm-login.page.ts
│   │   ├── dm-dashboard.page.ts
│   │   ├── dm-diagnostic.page.ts
│   │   ├── dm-network-analysis.page.ts
│   │   ├── dm-performance-monitoring.page.ts
│   │   ├── dm-report-generation.page.ts
│   │   └── components/
│   │       ├── dm-diagnostic-wizard.component.ts
│   │       ├── dm-metrics-chart.component.ts
│   │       └── dm-alert-panel.component.ts
│   │
│   ├── sdu/
│   │   ├── sdu-login.page.ts
│   │   ├── sdu-dashboard.page.ts
│   │   ├── sdu-service-problem.page.ts
│   │   ├── sdu-diagnosis.page.ts
│   │   ├── sdu-resolution.page.ts
│   │   ├── sdu-customer-lookup.page.ts
│   │   └── components/
│   │       ├── sdu-problem-form.component.ts
│   │       ├── sdu-diagnostic-steps.component.ts
│   │       └── sdu-customer-info.component.ts
│   │
│   ├── wisetool/
│   │   ├── wisetool-login.page.ts
│   │   ├── wisetool-dashboard.page.ts
│   │   ├── wisetool-analysis.page.ts
│   │   ├── wisetool-data-extraction.page.ts
│   │   ├── wisetool-reporting.page.ts
│   │   ├── wisetool-export.page.ts
│   │   └── components/
│   │       ├── wisetool-analysis-panel.component.ts
│   │       ├── wisetool-data-grid.component.ts
│   │       └── wisetool-export-modal.component.ts
│   │
│   ├── magictool/
│   │   ├── keycloak-login.page.ts
│   │   ├── magictool-home.page.ts
│   │   ├── magictool-dashboard.page.ts
│   │   ├── magictool-customer-service.page.ts
│   │   ├── magictool-order-management.page.ts
│   │   ├── magictool-billing.page.ts
│   │   ├── magictool-profile.page.ts
│   │   └── components/
│   │       ├── magictool-sso-redirect.component.ts
│   │       ├── magictool-customer-search.component.ts
│   │       ├── magictool-order-form.component.ts
│   │       └── magictool-payment-modal.component.ts
│   │
│   ├── sagres/
│   │   ├── sagres-login.page.ts
│   │   ├── sagres-dashboard.page.ts
│   │   ├── sagres-cpq-management.page.ts
│   │   ├── sagres-quote-creation.page.ts
│   │   ├── sagres-pricing.page.ts
│   │   ├── sagres-approval-workflow.page.ts
│   │   └── components/
│   │       ├── sagres-quote-builder.component.ts
│   │       ├── sagres-product-catalog.component.ts
│   │       ├── sagres-pricing-table.component.ts
│   │       └── sagres-approval-status.component.ts
│   │
│   ├── safira/
│   │   ├── safira-home.page.ts
│   │   ├── safira-navigation.page.ts
│   │   ├── safira-content-viewer.page.ts
│   │   ├── safira-search.page.ts
│   │   └── components/
│   │       ├── safira-menu.component.ts
│   │       ├── safira-breadcrumb.component.ts
│   │       └── safira-content-frame.component.ts
│   │
│   ├── wde/
│   │   ├── wde-login.page.ts
│   │   ├── wde-workspace.page.ts
│   │   ├── wde-interaction-handler.page.ts
│   │   ├── wde-customer-screen-pop.page.ts
│   │   ├── wde-call-controls.page.ts
│   │   ├── wde-chat-interface.page.ts
│   │   ├── wde-email-interface.page.ts
│   │   └── components/
│   │       ├── wde-interaction-panel.component.ts
│   │       ├── wde-customer-info-panel.component.ts
│   │       ├── wde-media-controls.component.ts
│   │       └── wde-queue-status.component.ts
│   │
│   ├── sielbel/
│   │   ├── sielbel-login.page.ts
│   │   ├── sielbel-dashboard.page.ts
│   │   ├── sielbel-crm.page.ts
│   │   ├── sielbel-attendance.page.ts
│   │   ├── sielbel-customer-registration.page.ts
│   │   ├── sielbel-service-history.page.ts
│   │   └── components/
│   │       ├── sielbel-customer-form.component.ts
│   │       ├── sielbel-attendance-timeline.component.ts
│   │       └── sielbel-service-notes.component.ts
│   │
│   └── next/
│       ├── logincorp-login.page.ts
│       ├── next-home.page.ts
│       ├── next-dashboard.page.ts
│       ├── next-service-portal.page.ts
│       ├── next-billing-portal.page.ts
│       ├── next-support-tickets.page.ts
│       ├── next-profile-settings.page.ts
│       └── components/
│           ├── next-sso-handler.component.ts
│           ├── next-service-catalog.component.ts
│           ├── next-billing-summary.component.ts
│           └── next-ticket-form.component.ts
│
├── fixtures/
│   ├── auth/
│   │   ├── zeus-auth.fixtures.ts
│   │   ├── wfm-auth.fixtures.ts
│   │   ├── nice-auth.fixtures.ts
│   │   ├── goi-auth.fixtures.ts
│   │   ├── dm-auth.fixtures.ts
│   │   ├── sdu-auth.fixtures.ts
│   │   ├── wisetool-auth.fixtures.ts
│   │   ├── magictool-sso.fixtures.ts
│   │   ├── sagres-auth.fixtures.ts
│   │   ├── safira-auth.fixtures.ts
│   │   ├── wde-auth.fixtures.ts
│   │   ├── sielbel-auth.fixtures.ts
│   │   ├── next-sso.fixtures.ts
│   │   └── shared-cookies.fixtures.ts
│   ├── api/
│   │   ├── zeus-api.fixtures.ts
│   │   ├── wfm-api.fixtures.ts
│   │   ├── magictool-api.fixtures.ts
│   │   └── [outros sistemas...]
│   └── data/
│       ├── zeus-data.fixtures.ts
│       ├── wfm-data.fixtures.ts
│       └── [outros sistemas...]
│
├── utils/
│   ├── auth/
│   │   ├── sso-handler.ts
│   │   ├── cookie-manager.ts
│   │   └── credential-rotator.ts
│   ├── legacy/
│   │   ├── jsf-helper.ts
│   │   ├── xhtml-helper.ts
│   │   └── iframe-handler.ts
│   ├── network/
│   │   ├── internal-dns.ts
│   │   └── proxy-handler.ts
│   ├── data/
│   │   ├── dataGenerator.ts
│   │   ├── dateHelpers.ts
│   │   └── formatHelpers.ts
│   └── assertions/
│       ├── tableAssertions.ts
│       ├── formAssertions.ts
│       └── visualAssertions.ts
│
├── config/
│   ├── systems.config.ts
│   ├── environments.config.ts
│   └── credentials.config.ts
│
└── test-data/
    ├── zeus/
    │   ├── users.json
    │   └── expected-data.json
    ├── wfm/
    ├── magictool/
    └── [outros sistemas...]
