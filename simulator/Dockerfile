FROM docker.io/library/node:24-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy simulator source code
COPY . .

# Run the simulator
CMD ["npm", "run", "all"]
