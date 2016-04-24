#!/usr/bin/env bash
echo "TCP Listener, Dashboard Web Server, Simulation Server, Live Monitor Server & Compute Server initializing..." &
python run.py listener 8889 &
python run.py dash 9000 &
python run.py sim 9001 &
python run.py live 9002 &
python run.py compute 9003



