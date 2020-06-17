sudo yum install podman
sudo git clone https://github.com/vipin3699/File-Server.git; cd File-Server
sudo podman build --layers --force-rm --tag file-server .
sudo podman run -d -p 5000:5000 file-server

# Use this command if you want to attach a result directory to container
#sudo podman run -d -v file_path:/home/resut_files/:Z -p 5000:5000 file-server
