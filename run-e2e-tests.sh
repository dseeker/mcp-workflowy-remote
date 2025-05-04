#!/bin/bash

# Prompt the user for their username and password
read -p "Enter your Workflowy username: " WORKFLOWY_USERNAME
read -s -p "Enter your Workflowy password: " WORKFLOWY_PASSWORD
echo # Add a new line after password input

# Export the variables so they are available to the npm process
export WORKFLOWY_USERNAME
export WORKFLOWY_PASSWORD

# Run the end-to-end tests
npm run test:e2e