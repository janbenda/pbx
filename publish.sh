#cp -r /home/jan/pbx/* /run/user/1000/gvfs/sftp\:host\=192.168.2.7\,port\=222\,user\=root/var/lib/asterisk/static-http/c/
echo Zepter2x.
scp -P 222 -r /home/jan/pbx/* root@192.168.2.7:/var/lib/asterisk/static-http/c/ 
