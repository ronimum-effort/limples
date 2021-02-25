#!/bin/bash

RUNNER_NAME=$(curl -s "$ECS_CONTAINER_METADATA_URI_V4/task" \
  | jq -r ".TaskARN" \
  | cut -d "/" -f 3)
RUNNER_WORKDIR=${RUNNER_WORKDIR:-_work}

if [[ -z "${GITHUB_ACCESS_TOKEN}" || -z "${GITHUB_ACTIONS_RUNNER_CONTEXT}" ]]; then
  echo 'One of the mandatory parameters is missing. Quit!'
  exit 1
else
  AUTH_HEADER="Authorization: token ${GITHUB_ACCESS_TOKEN}"
  USERNAME=$(cut -d/ -f4 <<< ${GITHUB_ACTIONS_RUNNER_CONTEXT})
  REPOSITORY=$(cut -d/ -f5 <<< ${GITHUB_ACTIONS_RUNNER_CONTEXT})

  if [[ -z "${REPOSITORY}" ]]; then 
    TOKEN_REGISTRATION_URL="https://api.github.com/orgs/${USERNAME}/actions/runners/registration-token"
    REMOVE_REGISTRATION_URL="https://api.github.com/orgs/${USERNAME}/actions/runners/remove-token"
  else
    TOKEN_REGISTRATION_URL="https://api.github.com/repos/${USERNAME}/${REPOSITORY}/actions/runners/registration-token"
    REMOVE_REGISTRATION_URL="https://api.github.com/repos/${USERNAME}/${REPOSITORY}/actions/runners/remove-token"
  fi
    
  RUNNER_TOKEN="$(curl -XPOST -fsSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "${AUTH_HEADER}" \
    "${TOKEN_REGISTRATION_URL}" \
    | jq -r '.token')"
fi

./config.sh --unattended --url "${GITHUB_ACTIONS_RUNNER_CONTEXT}" --token "${RUNNER_TOKEN}" --name "${RUNNER_NAME}" --work "${RUNNER_WORKDIR}"

remove() {
  DEREGISTER_TOKEN="$(curl -XPOST -fsSL \
    -H "Accept: application/vnd.github.v3+json" \
    -H "${AUTH_HEADER}" \
    "${REMOVE_REGISTRATION_URL}" \
    | jq -r '.token')"
  ./config.sh remove --unattended --token "${DEREGISTER_TOKEN}"
}

trap 'remove; exit 15' SIGTERM
trap 'remove; exit 9' SIGKILL

./runsvc.sh "$*" &

wait $!
