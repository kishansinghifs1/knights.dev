# Use stable Node LTS (20) instead of Node 21
FROM node:20-slim

# Install necessary tools
RUN apt-get update && apt-get install -y curl git ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy custom compile script
COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# Set working directory
WORKDIR /home/user/nextjs-app

# Pre-create Next.js project (force overwrite)
RUN npx --yes create-next-app@15.3.3 . --yes

# Install ShadCN components (neutral theme)
RUN npx --yes shadcn@2.6.3 init --yes -b neutral --force
RUN npx --yes shadcn@2.6.3 add --all --yes

# Move the Next.js app to the home directory and clean up
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app

# Set default workdir for sandbox
WORKDIR /home/user

# Run compile script by default (optional)
CMD ["/compile_page.sh"]
