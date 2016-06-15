# observer-monitoring
A monitoring tool for checking the status of local/remote servers, based on <a href="https://github.com/giampaolo/psutil">psutil</a>, <a href="https://github.com/tornadoweb/tornado">Tornado</a> and <a href="https://github.com/mongodb/mongo">MongoDB</a>.

*Addresses associated with the servers:*
+ **Remote sender** : [REMOTE_IP_ADDRESS]:8888
+ **TCP listener** : [ROOT_IP_ADDRESS]:8889
+ **HTTP web server** : [ROOT_IP_ADDRESS]:9000
 
## How-to-run:
### Root server 
 Setup root server on a machine of your choice:
 ```bash
 $ bash run-root.sh
 ```
 This will run your **TCP listener** and **HTTP web server** on the machine.
 
### Remote senders
 Run the remote sender(s) on whichever machine(s) you want to monitor (could be on your root as well):
 ```bash
 $ bash run-remote.sh
Observer remote running at port 8888
Enter destination IP: 
54.179.143.69 
Enter destination port: 
8889
Enter remote name: 
foobar-production
Enter preferred NIC: 
eth0
 ```
### Dashboard navigation
++ **Live monitoring** : [ROOT_IP_ADDRESS]:9000/live
++ **Statistical data** : [ROOT_IP_ADDRESS]:9000/stats
++ **Performance testing** : [ROOT_IP_ADDRESS]:9000/perf

<a href="http://imgur.com/KALI2zL"><img src="http://i.imgur.com/KALI2zL.png" title="source: imgur.com" /></a>
<br/>
<a href="http://imgur.com/zRYCVqf"><img src="http://i.imgur.com/zRYCVqf.png" title="source: imgur.com" /></a>
<br/>
<a href="http://imgur.com/oTAL194"><img src="http://i.imgur.com/oTAL194.png" title="source: imgur.com" /></a>
<br/>
<a href="http://imgur.com/sSYG69F"><img src="http://i.imgur.com/sSYG69F.png" title="source: imgur.com" /></a>
<br/>
<a href="http://imgur.com/NBlxMlm"><img src="http://i.imgur.com/NBlxMlm.png" title="source: imgur.com" /></a>
<br/>
<a href="http://imgur.com/SIfXj2z"><img src="http://i.imgur.com/SIfXj2z.png" title="source: imgur.com" /></a>
<br/>
<a href="http://imgur.com/WxKtrsf"><img src="http://i.imgur.com/WxKtrsf.png" title="source: imgur.com" /></a>
