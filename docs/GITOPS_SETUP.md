# GitOps/ArgoCD Setup (Opcional)

Este projeto pode publicar imagens no Docker Hub e atualizar um repositório GitOps (monitorado pelo ArgoCD). Se você ainda não tem o repo GitOps, siga:

1) Crie o repositório (ex.: `dan1993/gitops-argocd`).

2) Estruture os diretórios (mínimo):
```
.gitignore
k8s/
  base/                 # opcional
  overlays/
    dev/
      kustomization.yaml
    hmg/
      kustomization.yaml
    prd/
      kustomization.yaml
```
Cada `kustomization.yaml` deve referenciar as bases/manifests do seu cluster e permitir `set image` nos nomes lógicos:
- `freelas-api`
- `freelas-matcher`
- `freelas-web`

Exemplo (overlays/dev/kustomization.yaml):
```
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../path/para/seus/manifests/api.yaml
  - ../../path/para/seus/manifests/matcher.yaml
  - ../../path/para/seus/manifests/web.yaml
images:
  - name: freelas-api
    newName: dan1993/freelas-api
    newTag: dev
  - name: freelas-matcher
    newName: dan1993/freelas-matcher
    newTag: dev
  - name: freelas-web
    newName: dan1993/freelas-web
    newTag: dev
```
Os workflows de CD daqui irão substituir `newTag` automaticamente para `dev-<shortsha>` (imutável).

3) Acesse Settings → Developer settings e gere um PAT com escopo `repo` para commitar no GitOps repo. Adicione no repo de aplicação:
- `GITOPS_REPO`: ex. `dan1993/gitops-argocd`
- `GITOPS_TOKEN`: PAT com permissão de escrita

4) Configure o ArgoCD apontando para `k8s/overlays/dev` (e `hmg`/`prd`) do seu repo GitOps.

5) Pronto. Nos workflows `*-cd.yml` deste repo, se `GITOPS_REPO` não estiver configurado, a etapa de GitOps é pulada (com aviso) e o job finaliza com sucesso.
