# AWS Integrations (Frontend)

This folder contains all AWS-related integration code for the **frontend** (React app) only.

- Place AWS SDK, Amplify, Cognito, S3, and Lambda API call helpers here.
- Use this folder for code that runs in the browser or is shared with the frontend (e.g., authentication, file uploads, calling Lambda endpoints via API Gateway).
- **Do not** place backend/serverless code (Lambda source, infra) here—use the root-level `aws/` folder for that.

**Typical contents:**
- Amplify configuration and helpers
- Cognito authentication helpers
- S3 upload/download helpers
- Lambda API call helpers (for calling your own backend endpoints)

**Do not:**
- Place Lambda function source code here
- Place backend infrastructure or deployment scripts here

See also: `aws/README.md` for backend/serverless details.
