@echo off 
 
rem set JAVA_HOME=C:/Program Files/Java/jdk1.8.0_77
set JAVA_HOME=D:/progFile/Java/jdk1.8.0_91
set PATH="%JAVA_HOME%\bin";%PATH%
 
cmd /c "start /min  java -Xint  -jar YacaAgentTestClient.jar"
cmd /c "start /min  chrome http://localhost:8082/monitor"
java -jar YacaAgent.jar"
 