# Spa Josy Cruz — Agendamento PWA v1.3

PWA estático de agendamento do Spa Josy Cruz, preparado para publicação inicial gratuita no GitHub Pages.

## Funções da versão 1.3

- Auto cadastro do cliente com nome, WhatsApp e e-mail opcional.
- Escolha de serviço.
- Escolha de data.
- Horários em botões.
- Confirmação automática do horário no navegador.
- Painel administrativo discreto, sem botão visível para clientes.
- Exportação JSON e CSV.
- Manifest e service worker para comportamento de PWA.

## Acesso administrativo do protótipo

Na tela pública, toque 5 vezes no texto `Spa Josy Cruz` no topo.

PIN do protótipo: `0711`.

Atenção: este PIN serve apenas para demonstração. Em produção, substituir por autenticação real.

## Limite da versão atual

Esta versão usa `localStorage`. Portanto, os dados ficam no navegador. Para operação real com vários clientes, implementar backend central.

Sem backend central, dois clientes em celulares diferentes podem escolher o mesmo horário sem enxergar a agenda um do outro.

## Publicação no GitHub Pages

1. Criar repositório `spa-josy-cruz-agendamento`.
2. Enviar todos os arquivos deste pacote para a raiz do repositório.
3. Ativar GitHub Pages em `Settings` → `Pages`.
4. Source: `Deploy from a branch`.
5. Branch: `main` / `/root`.

Link esperado depois da publicação:

```text
https://juptermarcio.github.io/spa-josy-cruz-agendamento/
```

## Próxima fase obrigatória antes de liberar amplamente para clientes

- Banco central: Supabase, Firebase ou Google Sheets/API.
- Bloqueio real de horários.
- Autenticação administrativa real.
- Envio real de e-mail.
- Histórico permanente.
