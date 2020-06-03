sudo -i
yum install podman
git clone https://github.com/vipin3699/File-Server.git; cd File-Server
podman build --layers --force-rm --tag file-server .
podman run -d  -p 5000:5000 file-server
