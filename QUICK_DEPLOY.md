# AWS Deployment Quick Start

This is a quick reference guide for deploying your Credit Card Tracker to AWS.

## 🎯 Choose Your Deployment Path

### **Option 1: Easiest - AWS Amplify + Elastic Beanstalk** ⭐ Recommended
**Time to deploy**: ~20 minutes
**Best for**: Beginners, quick deployments, automatic CI/CD

**Steps**:
1. Push code to GitHub
2. Deploy frontend to AWS Amplify (connect GitHub repo)
3. Deploy backend with Elastic Beanstalk CLI
4. Update environment variables

**Cost**: ~$15-30/month

---

### **Option 2: Cost-Effective - S3 + EC2**
**Time to deploy**: ~45 minutes
**Best for**: Budget-conscious, full control

**Steps**:
1. Build and upload frontend to S3
2. Launch EC2 instance
3. Install Node.js and deploy backend
4. Configure CloudFront (optional)

**Cost**: ~$5-15/month

---

### **Option 3: Production-Ready - Docker + ECS**
**Time to deploy**: ~60 minutes
**Best for**: Scalable production apps, containerized deployments

**Steps**:
1. Build Docker images
2. Push to Amazon ECR
3. Create ECS cluster and services
4. Configure load balancer

**Cost**: ~$40-80/month

---

## 📋 Pre-Deployment Checklist

- [ ] AWS account created and CLI configured
- [ ] Supabase database set up and running
- [ ] Code pushed to GitHub repository
- [ ] Environment variables documented
- [ ] Database migrations run on Supabase
- [ ] Local testing complete

---

## 🚀 Quick Deploy Commands

### Frontend (AWS Amplify - Manual)
1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect GitHub repository
4. Set build settings (see `amplify.yml`)
5. Add environment variables
6. Deploy

### Backend (Elastic Beanstalk)
```bash
# Install EB CLI
pip install awsebcli

# Navigate to backend
cd credit-card-tracker/backend

# Initialize
eb init -p node.js-18 credit-card-tracker-backend --region us-east-1

# Create and deploy
eb create credit-card-tracker-backend-env

# Set environment variables
eb setenv SUPABASE_URL=xxx SUPABASE_ANON_KEY=xxx ALLOWED_ORIGINS=xxx

# Open in browser
eb open
```

### Docker Deployment
```bash
# Build images
docker-compose build

# Test locally
docker-compose up

# Push to AWS ECR (see full guide)
```

---

## 🔐 Required Environment Variables

### Backend
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
ALLOWED_ORIGINS=https://your-frontend.amplifyapp.com
PORT=3001
```

### Frontend
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_API_URL=https://your-backend.elasticbeanstalk.com
```

---

## 📞 Need Help?

1. **Deployment fails?** Check CloudWatch logs
2. **API not connecting?** Verify CORS and environment variables
3. **Database issues?** Confirm Supabase credentials

**Full documentation**: See `AWS_DEPLOYMENT_GUIDE.md`

---

## ⚡ Post-Deployment

After successful deployment:

1. **Test the application** - Verify all features work
2. **Set up monitoring** - Configure CloudWatch alarms
3. **Custom domain** (optional) - Configure Route 53
4. **SSL certificate** (optional) - AWS Certificate Manager
5. **Backups** - Set up automated Supabase backups
6. **CI/CD** - GitHub Actions automatically configured

---

## 🎉 You're Done!

Your application is now live on AWS!

**Frontend URL**: `https://xxxxx.amplifyapp.com`
**Backend URL**: `https://xxxxx.elasticbeanstalk.com`

Remember to:
- Update CORS origins
- Monitor costs in AWS Billing Dashboard
- Set up CloudWatch alarms
- Review security settings
