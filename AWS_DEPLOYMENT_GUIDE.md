# AWS Deployment Guide - Credit Card Tracker

This guide provides multiple deployment options for deploying your full-stack application to AWS.

## 📋 Prerequisites

- AWS Account with appropriate permissions
- AWS CLI installed and configured (`aws configure`)
- Git repository pushed to GitHub
- Supabase account with database set up
- Node.js installed locally

## 🏗️ Architecture Overview

### Recommended Setup:
- **Frontend**: AWS Amplify (React/Vite app)
- **Backend**: AWS Elastic Beanstalk or ECS (Node.js/Express API)
- **Database**: Supabase (external)
- **Domain**: Route 53 (optional)
- **SSL**: AWS Certificate Manager (automatic with Amplify)

---

## 🚀 Deployment Options

### Option 1: AWS Amplify + Elastic Beanstalk (Recommended)
**Best for**: Easy setup, automatic CI/CD, built-in SSL

### Option 2: S3/CloudFront + EC2
**Best for**: Cost optimization, full control

### Option 3: Full Containerized (ECS/Fargate)
**Best for**: Microservices, scalability, Docker experience

---

## 📦 Option 1: AWS Amplify + Elastic Beanstalk

### Step 1: Deploy Frontend to AWS Amplify

1. **Login to AWS Console**
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"

2. **Connect Repository**
   - Select "GitHub" as your Git provider
   - Authorize AWS Amplify to access your GitHub account
   - Select your repository: `credit-card-tracker-fullstack`
   - Choose branch: `main`

3. **Configure Build Settings**
   - App name: `credit-card-tracker-frontend`
   - Environment: `production`
   - Build settings (will be auto-detected, but verify):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd credit-card-tracker/frontend
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: credit-card-tracker/frontend/dist
       files:
         - '**/*'
     cache:
       paths:
         - credit-card-tracker/frontend/node_modules/**/*
   ```

4. **Add Environment Variables**
   - Click "Environment variables" in Amplify
   - Add:
     - `VITE_SUPABASE_URL`: Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
     - `VITE_API_URL`: (Will add after backend deployment)

5. **Deploy**
   - Click "Save and deploy"
   - Wait for deployment to complete (~5 minutes)
   - Note your Amplify URL (e.g., `https://main.d1234abcdef.amplifyapp.com`)

### Step 2: Deploy Backend to AWS Elastic Beanstalk

#### A. Prepare Backend for Deployment

First, create necessary configuration files (see Configuration Files section below).

#### B. Deploy Using EB CLI

```bash
# Install Elastic Beanstalk CLI
pip install awsebcli

# Navigate to backend directory
cd credit-card-tracker/backend

# Initialize EB application
eb init -p node.js-18 credit-card-tracker-backend --region us-east-1

# Create environment and deploy
eb create credit-card-tracker-backend-env --single

# Set environment variables
eb setenv \
  SUPABASE_URL=your_supabase_url \
  SUPABASE_ANON_KEY=your_supabase_anon_key \
  ALLOWED_ORIGINS=https://your-amplify-url.amplifyapp.com \
  PORT=8080

# Open application
eb open
```

#### C. Alternative: Deploy via AWS Console

1. Go to Elastic Beanstalk Console
2. Click "Create Application"
3. Application name: `credit-card-tracker-backend`
4. Platform: Node.js 18
5. Upload your code (zip the backend folder)
6. Configure environment variables
7. Deploy

### Step 3: Update Frontend with Backend URL

```bash
# Update Amplify environment variables
# In AWS Amplify Console:
# - Go to App Settings → Environment variables
# - Add/Update VITE_API_URL with your EB URL
# - Redeploy the app
```

### Step 4: Configure CORS

Update your backend's allowed origins to include your Amplify URL.

---

## 📦 Option 2: S3 + CloudFront + EC2

### Frontend (S3 + CloudFront)

1. **Build Frontend**
```bash
cd credit-card-tracker/frontend
npm run build
```

2. **Create S3 Bucket**
```bash
aws s3 mb s3://credit-card-tracker-frontend --region us-east-1
aws s3 website s3://credit-card-tracker-frontend --index-document index.html --error-document index.html
```

3. **Upload Build**
```bash
aws s3 sync dist/ s3://credit-card-tracker-frontend --acl public-read
```

4. **Create CloudFront Distribution**
- Origin: Your S3 bucket
- Default Root Object: `index.html`
- Error Pages: Configure custom error response for 404 → /index.html (for React Router)

### Backend (EC2)

1. **Launch EC2 Instance**
   - AMI: Amazon Linux 2023
   - Instance type: t3.micro (free tier eligible)
   - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **SSH and Setup**
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip

# Install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install PM2
npm install -g pm2

# Clone repository
git clone https://github.com/YOUR_USERNAME/credit-card-tracker-fullstack.git
cd credit-card-tracker-fullstack/credit-card-tracker/backend
npm install

# Create .env file
nano .env
# Add your environment variables

# Start with PM2
pm2 start server.js --name credit-card-tracker-api
pm2 startup
pm2 save
```

3. **Configure Nginx (Optional)**
```bash
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure reverse proxy
sudo nano /etc/nginx/conf.d/api.conf
```

---

## 📦 Option 3: Docker + ECS/Fargate

See `docker-compose.yml` and Dockerfile configurations in the Configuration Files section.

### Deploy to ECS

1. **Build and Push Docker Images**
```bash
# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repositories
aws ecr create-repository --repository-name credit-card-tracker-frontend
aws ecr create-repository --repository-name credit-card-tracker-backend

# Build and push frontend
cd credit-card-tracker/frontend
docker build -t credit-card-tracker-frontend .
docker tag credit-card-tracker-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/credit-card-tracker-frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/credit-card-tracker-frontend:latest

# Build and push backend
cd ../backend
docker build -t credit-card-tracker-backend .
docker tag credit-card-tracker-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/credit-card-tracker-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/credit-card-tracker-backend:latest
```

2. **Create ECS Cluster**
```bash
aws ecs create-cluster --cluster-name credit-card-tracker-cluster
```

3. **Create Task Definitions and Services**
   - Use AWS Console or ECS CLI
   - Configure environment variables
   - Set up Application Load Balancer
   - Create services for frontend and backend

---

## 🔐 Environment Variables Checklist

### Backend (.env)
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
ALLOWED_ORIGINS=https://your-frontend-url.com
PORT=3001
```

### Frontend (.env.production)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://your-backend-url.com
```

---

## 🔒 Security Best Practices

1. **Use AWS Secrets Manager** for sensitive environment variables
2. **Enable HTTPS** for all endpoints
3. **Configure Security Groups** restrictively
4. **Use IAM roles** instead of access keys when possible
5. **Enable CloudWatch logging** for monitoring
6. **Set up AWS WAF** for additional protection
7. **Use VPC** for backend services

---

## 💰 Cost Estimates (Monthly)

### Budget-Friendly Setup:
- AWS Amplify (Frontend): $0-5 (free tier + ~1GB transfer)
- Elastic Beanstalk (Backend): $15-25 (t3.micro instance)
- Route 53 (Optional): $0.50/domain
- **Total: ~$15-30/month**

### Production Setup:
- AWS Amplify: $10-20
- ECS Fargate (Backend): $30-50
- Application Load Balancer: $16-25
- CloudWatch: $5-10
- **Total: ~$60-100/month**

---

## 📊 Monitoring & Logging

### CloudWatch Setup
```bash
# View logs
aws logs tail /aws/elasticbeanstalk/credit-card-tracker-backend-env/var/log/nodejs/nodejs.log --follow

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

---

## 🔄 CI/CD Setup

AWS Amplify automatically handles CI/CD for the frontend. For the backend:

### Option A: AWS CodePipeline
1. Create CodePipeline in AWS Console
2. Source: GitHub repository
3. Build: AWS CodeBuild
4. Deploy: Elastic Beanstalk

### Option B: GitHub Actions
See `.github/workflows/deploy.yml` in Configuration Files section.

---

## 🐛 Troubleshooting

### Frontend Issues
- **Build fails**: Check environment variables in Amplify
- **API calls fail**: Verify CORS configuration and API URL
- **Routing issues**: Ensure CloudFront/Amplify redirects are configured

### Backend Issues
- **502 Bad Gateway**: Check application logs in CloudWatch
- **Connection timeout**: Verify security group rules
- **Database connection**: Confirm Supabase credentials and network access

### Common Commands
```bash
# EB CLI
eb logs                    # View logs
eb ssh                     # SSH into instance
eb deploy                  # Deploy updates
eb status                  # Check status

# Amplify CLI
amplify status            # Check status
amplify console           # Open console
```

---

## 📚 Additional Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Supabase Documentation](https://supabase.com/docs)

---

## 🎯 Next Steps

1. Choose your deployment option
2. Follow the step-by-step guide
3. Configure environment variables
4. Test the deployment
5. Set up monitoring and alerts
6. Configure custom domain (optional)
7. Enable CI/CD pipeline

For questions or issues, refer to the troubleshooting section or AWS documentation.
