# Use Node.js 20 (LTS) on Alpine Linux for a small image size
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first to leverage Docker cache for dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# BUILD STEP:
# If you are using TypeScript, this runs the "build" script in your package.json.
# If you are using raw JavaScript, this line might fail or do nothing - you can remove it if so.
RUN npm run build

# Set the environment variable for the port
ENV PORT=3000
ENV NODE_ENV=production

# Expose the port to the outside world
EXPOSE 3000

# START COMMAND:
# If using TypeScript (built to 'dist'):
CMD ["node", "dist/index.js"]

# If using raw JavaScript (no build):
# CMD ["node", "index.js"]