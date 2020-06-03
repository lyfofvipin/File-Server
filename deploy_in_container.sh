sudo yum install podman
sudo git clone https://github.com/vipin3699/File-Server.git; cd File-Server
sudo podman build --layers --force-rm --tag file-server .
sudo podman run -d  -p 5000:5000 file-server
