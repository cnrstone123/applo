package tmp;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

public class Snippets {
    public static void main(String... args){
        analyze_ln();
    }
    private static void analyze_ln(){
        String[] lines = {
        "'org.eclipse.jdt.debug: JDI Event Dispatcher' #5501 daemon prio=5 os_prio=0 tid=0x000000002087c000 nid=0x1b48 in Object.wait() [0x000000004095f000] (CallStackAnalyzer.java:132)", 
                "   java.lang.Thread.State: TIMED_WAITING (on object monitor) (CallStackAnalyzer.java:132) ",
                "  at java.lang.Object.wait(Native Method) (CallStackAnalyzer.java:132) ",
                "  at org.eclipse.jdi.internal.connect.PacketReceiveManager.waitForPacketAvailable(PacketReceiveManager.java:211) (CallStackAnalyzer.java:132)", 
                "  at org.eclipse.jdi.internal.connect.PacketReceiveManager.getCommand(PacketReceiveManager.java:114) (CallStackAnalyzer.java:132) ",
                "  - locked <0x00000000f61e0680> (a java.util.LinkedList) (CallStackAnalyzer.java:132) ",
                "  at org.eclipse.jdi.internal.MirrorImpl.getCommandVM(MirrorImpl.java:321) (CallStackAnalyzer.java:132)", 
                "  at org.eclipse.jdi.internal.event.EventQueueImpl.remove(EventQueueImpl.java:68) (CallStackAnalyzer.java:132)", 
                "  at com.zeroturnaround.jdi.event.JREventQueue.remove(JREventQueue.java:107) (CallStackAnalyzer.java:132) ",
                "  at org.eclipse.jdt.internal.debug.core.EventDispatcher.run(EventDispatcher.java:240) (CallStackAnalyzer.java:132)", 
                "  at java.lang.Thread.run(Thread.java:745) (CallStackAnalyzer.java:132) ",
                " (CallStackAnalyzer.java:132) ",
                "'Timer-274' #5500 daemon prio=6 os_prio=0 tid=0x000000001ece1000 nid=0xcd4 in Object.wait() [0x000000004055f000] (CallStackAnalyzer.java:132)", 
                "   java.lang.Thread.State: WAITING (on object monitor) (CallStackAnalyzer.java:132) ",
                "  at java.lang.Object.wait(Native Method) (CallStackAnalyzer.java:132) ",
                "  at java.lang.Object.wait(Object.java:502) (CallStackAnalyzer.java:132) ",
                "  at java.util.TimerThread.mainLoop(Timer.java:526) (CallStackAnalyzer.java:132)", 
                "  - locked <0x00000000f62190d8> (a java.util.TaskQueue) (CallStackAnalyzer.java:132)", 
                "  at java.util.TimerThread.run(Timer.java:505) (CallStackAnalyzer.java:132) ",
                " (CallStackAnalyzer.java:132) ",
                "'Packet Send Manager' #5499 daemon prio=5 os_prio=0 tid=0x000000001ece5000 nid=0xd18 in Object.wait() [0x000000004075f000] (CallStackAnalyzer.java:132)", 
                "   java.lang.Thread.State: WAITING (on object monitor) (CallStackAnalyzer.java:132) ",
                "  at java.lang.Object.wait(Native Method) (CallStackAnalyzer.java:132) ",
                "  at java.lang.Object.wait(Object.java:502) (CallStackAnalyzer.java:132) ",
                "  at org.eclipse.jdi.internal.connect.PacketSendManager.sendAvailablePackets(PacketSendManager.java:109) (CallStackAnalyzer.java:132)", 
                "  - locked <0x00000000f61e0588> (a java.util.LinkedList) (CallStackAnalyzer.java:132) ",
                "  at org.eclipse.jdi.internal.connect.PacketSendManager.run(PacketSendManager.java:55) (CallStackAnalyzer.java:132)", 
                "  at java.lang.Thread.run(Thread.java:745) (CallStackAnalyzer.java:132) ",
                " (CallStackAnalyzer.java:132) ",
                "'rebel-notificationServer-singleton-1' #28 daemon prio=5 os_prio=0 tid=0x000000001733a800 nid=0x1044 runnable [0x000000001e6bf000] (CallStackAnalyzer.java:132)", 
                "   java.lang.Thread.State: RUNNABLE (CallStackAnalyzer.java:132) ",
                "  at java.net.DualStackPlainSocketImpl.accept0(Native Method) (CallStackAnalyzer.java:132)", 
                "  at java.net.DualStackPlainSocketImpl.socketAccept(DualStackPlainSocketImpl.java:131) (CallStackAnalyzer.java:132)", 
                "  at java.net.AbstractPlainSocketImpl.accept(AbstractPlainSocketImpl.java:409) (CallStackAnalyzer.java:132) ",
                "  at java.net.PlainSocketImpl.accept(PlainSocketImpl.java:199) (CallStackAnalyzer.java:132) ",
                "  - locked <0x00000000c2e875c0> (a java.net.SocksSocketImpl) (CallStackAnalyzer.java:132) ",
                "  at java.net.ServerSocket.implAccept(ServerSocket.java:545) (CallStackAnalyzer.java:132) ",
                "  at java.net.ServerSocket.accept(ServerSocket.java:513) (CallStackAnalyzer.java:132) ",
                "  at org.zeroturnaround.jrebel.ide.common.notifications.NotificationServer$1.run(NotificationServer.java:149) (CallStackAnalyzer.java:132)", 
                "  at org.zeroturnaround.common.util.ExecutorUtil$RunnableWrapper.run(ExecutorUtil.java:153) (CallStackAnalyzer.java:132) ",
                "  at java.util.concurrent.Executors$RunnableAdapter.call(Executors.java:511) (CallStackAnalyzer.java:132) ",
                "  at java.util.concurrent.FutureTask.run(FutureTask.java:266) (CallStackAnalyzer.java:132) ",
                "  at java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.access$201(ScheduledThreadPoolExecutor.java:180) (CallStackAnalyzer.java:132)", 
                "  at java.util.concurrent.ScheduledThreadPoolExecutor$ScheduledFutureTask.run(ScheduledThreadPoolExecutor.java:293) (CallStackAnalyzer.java:132)", 
                "  at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1142) (CallStackAnalyzer.java:132) ",
                "  at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:617) (CallStackAnalyzer.java:132) ",
                "  at java.lang.Thread.run(Thread.java:745) (CallStackAnalyzer.java:132) ",
                " (CallStackAnalyzer.java:132) "
        };
        List<String> lineLst = Arrays.asList(lines);
        List<String> bucket = new ArrayList<String>();
        String prefixLine = "  at";
        String whiteListFilter = "((s|S)ocket|(t|T)hread|java\\.util\\.)";
        String blackListFilter = "(eclipse|zeroturnaround)";
        Pattern whitePtrn = Pattern.compile(whiteListFilter);
        Pattern blackPtrn = Pattern.compile(blackListFilter);
        for(String line : lineLst){
            System.out.println(line);
            if(line.startsWith(prefixLine) && line.length() > 10){
                String fullMethodName = line.substring(4, line.lastIndexOf('(')).trim();
                if(whiteListFilter.isEmpty() || whitePtrn.matcher(fullMethodName).find()){
                    if(blackListFilter.isEmpty() || !blackPtrn.matcher(fullMethodName).find()){
                        bucket.add(fullMethodName);
                    } else System.out.println("\t.blackList match.");
                } else System.out.println("\t.whiteList not match.");
            } else System.out.println("\t.skipping");
        }
        for(String fullMethodName :bucket){
            System.out.println(fullMethodName);
        }
    }
}
