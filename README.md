# Build and push image
```
chmod +x scripts/build-and-push.sh
./scripts/build-and-push.sh
```
# Deploy to Kubernetes
```
chmod +x scripts/deploy.sh
./scripts/deploy.sh production game-platform
```
# Or use helm directly
```
helm install game-platform ./helm/game-platform \
  --namespace production \
  --create-namespace \
  --set image.repository=your-registry.example.com/game-platform \
  --set image.tag=1.0.0 \
  --set ingress.hosts[0].host=game.yourdomain.com
```
# Upgrade
```
helm upgrade game-platform ./helm/game-platform \
  --namespace production
```
# Uninstall
```
helm uninstall game-platform --namespace production
```