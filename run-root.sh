#!/usr/bin/env bash
echo "TCP Listener, HTTP Web Server, Simulation Server initializing..." &
python run.py tcp 8889 &
python run.py http 9000 &
python run.py http_sim 9001



