FROM fedora:latest
MAINTAINER Kumar Vipin Yadav "kumarvipinyadav369@gmail.com"

RUN dnf install -y python3-pip && dnf clean all

WORKDIR /opt/file-server-cli

COPY requirements-cli.txt file_server ./

RUN python3 -m pip install --no-cache-dir -r requirements-cli.txt && \
    chmod +x file_server

ENTRYPOINT ["/opt/file-server-cli/file_server"]
CMD ["--help"]
