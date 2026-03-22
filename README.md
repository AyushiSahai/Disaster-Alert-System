# Disaster Tweet Monitor & Alert System

A web application that monitors weather conditions and sends real-time disaster alerts to subscribed users via email using AWS SNS.

## Features
- Secure user signup and login
- Admin approval system for new users
- Weather condition monitoring using OpenWeather API
- Automated email alerts via AWS SNS when dangerous conditions detected
- User data stored in AWS DynamoDB
- Form data backed up to AWS S3

## Tech Stack
- **Backend:** Node.js, Express.js
- **Cloud:** AWS (EC2, S3, DynamoDB, SNS, IAM)
- **Frontend:** HTML, CSS, JavaScript
- **APIs:** OpenWeather API

## Setup
1. Clone the repo and run `npm install`
2. Copy `.env.example` to `.env` and fill in your values
3. Set up AWS services (S3, DynamoDB, SNS, IAM) as described below
4. Run with `npm start` and open `http://localhost:4000`

## AWS Setup
- **S3:** Create a bucket for storing form data
- **DynamoDB:** Create `DisasterUsers` table with `email` as partition key
- **SNS:** Create `DisasterAlerts` topic and add email subscriptions
- **IAM:** Create policy with least-privilege access to S3, DynamoDB, and SNS