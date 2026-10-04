# Deploy bằng Docker + nginx. Chi tiết: deploy/README.md
#
#   make init production      tạo deploy/env/production.env (sinh sẵn secret)
#   make deploy production    deploy lên máy chủ qua SSH
#   make deploy local         deploy vào WSL (http://localhost:8080)
#   make status|logs|down|backup <production|local>

ENVIRONMENTS := production local
COMMANDS := init deploy status logs down backup
ENV := $(firstword $(filter $(ENVIRONMENTS),$(MAKECMDGOALS)))

.PHONY: help $(COMMANDS) $(ENVIRONMENTS)

help:
	@sed -n '1,7p' Makefile | sed 's/^# \{0,1\}//'

$(COMMANDS):
	@bash deploy/deploy.sh $@ $(or $(ENV),$(error Hãy chỉ định môi trường: make $@ production|local))

# Môi trường chỉ là tham số của lệnh phía trước, bản thân không làm gì.
$(ENVIRONMENTS):
	@:
