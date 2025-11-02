FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npx tsc --project tsconfig.server.json

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

RUN chown -R nextjs:nodejs /app

USER nextjs

# Copy package files
COPY --chown=nextjs:nodejs package.json package-lock.json ./

# Copy node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built files
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist

# Copy source
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# Copy TypeScript configs
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.server.json ./tsconfig.server.json

# Copy Next.js config (you have next.config.ts)
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

# Copy type definitions
COPY --from=builder --chown=nextjs:nodejs /app/next-env.d.ts ./next-env.d.ts

# Copy Tailwind and PostCSS configs
COPY --from=builder --chown=nextjs:nodejs /app/postcss.config.mjs ./postcss.config.mjs

# Copy ESLint config
COPY --from=builder --chown=nextjs:nodejs /app/eslint.config.mjs ./eslint.config.mjs

RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]