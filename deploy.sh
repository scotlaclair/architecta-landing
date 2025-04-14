#!/bin/bash
echo "Deploying Architecta Landing..."
git add .
git commit -m "Update site content"
git push origin main
echo "Pushed to GitHub – trigger Cloudflare Pages deploy"
