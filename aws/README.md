# AWS Backend Folder

This folder contains all AWS backend/serverless code and infrastructure for the project.

- **lambdas/**: Source code for all custom AWS Lambda functions. Each Lambda should have its own subfolder and (optionally) its own package.json for dependencies.
- **bedrock-agent/**: (If present) AWS Bedrock agent configuration and related files.

**Purpose:**
- Keep all backend/serverless code, deployment scripts, and AWS-specific infrastructure separate from frontend and integration code.
- Do not place frontend AWS SDK or Amplify code here—use `src/integrations/aws/` for that.

**Typical contents:**
- Lambda function source code
- Infrastructure as code (CloudFormation, SAM, CDK, etc.)
- Backend configuration files

**Do not:**
- Place frontend code or SDKs here
- Place Supabase code here

See also: `src/integrations/aws/README.md` for frontend AWS integration details.
