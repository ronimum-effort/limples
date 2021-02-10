FROM ubuntu:20.04

ENV GITHUB_RUNNER_VERSION=2.276.1

RUN apt-get update && apt-get install -y --no-install-recommends \
  curl \
  ca-certificates \
  jq \
  && rm -rf /var/lib/apt/lists/*


RUN addgroup runner && \
  adduser \
  --system \
  --disabled-password \
  --home /home/runner \
  --ingroup runner \
  runner

WORKDIR /home/runner

RUN curl -sSLO https://github.com/actions/runner/releases/download/v${GITHUB_RUNNER_VERSION}/actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz \
  && ls -alh \
  && tar -zxvf actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz \
  && rm -f actions-runner-linux-x64-${GITHUB_RUNNER_VERSION}.tar.gz \
  && ./bin/installdependencies.sh \
  && chown -R runner:runner /home/runner

COPY entrypoint.sh entrypoint.sh

USER runner

ENTRYPOINT ["./entrypoint.sh"]