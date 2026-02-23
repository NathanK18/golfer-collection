Nathan Kitchens Golfer Collection Project 3

Live URL
https://nkgolfmanager.golf

Domain Information 
Domain name: nkgolfmanager.golf
Registrar: Namecheap
This domain is configured to point the Render web service using DNS CNAME records.
HTTPS is automatically supplied and enfirced by Render.

Hosting Information 
Provider: Render 
Service Type: Web Service 
Deployment method: Github repo
Auto Deploy enabled to push to main branch 
Applicaion is publicly accessible and does not requrire authentication 

Tech Stack
Frontend: HTML, CSS, JS, client side hashed routing
Backend: Python, Flask, SQLAlchemy
RESTful API 

Database 
Type: PostgreSQL
Hosted on Render managed PostgreSQL Service 
Connection method using environment variable
All data is stored on PostgreSQL
No JSON file storage 

How to deploy and update 
1. Push changes to Github repo
2. Render builds and redeploys
3. Monitor deployment logs 
4. verify functionality on the live domain 

Config and secrets managment 
Sensitive config values are stored using environment variables 
The primary variable being DATABASE_URL
The value is configured in the render dashboard 
No database credentials or secrets are commited to the repo 

Application Architecture 
Browser -> Static Frontend -> Fetch API request -> Flask REST API -> SQLAlchemy -> PostgreSQL Database 