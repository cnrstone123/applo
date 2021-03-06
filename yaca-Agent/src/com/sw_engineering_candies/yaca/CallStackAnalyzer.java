/*
 * Copyright (C) 2012-2016, Markus Sprunck <sprunck.markus@gmail.com>
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * - The name of its contributor may be used to endorse or promote products
 * derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

package com.sw_engineering_candies.yaca;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.management.ManagementFactory;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import sun.jvmstat.monitor.MonitorException;
import sun.jvmstat.monitor.MonitoredHost;
import sun.jvmstat.monitor.MonitoredVm;
import sun.jvmstat.monitor.MonitoredVmUtil;
import sun.jvmstat.monitor.VmIdentifier;
import sun.tools.attach.HotSpotVirtualMachine;

import com.sun.tools.attach.AttachNotSupportedException;
import com.sun.tools.attach.VirtualMachine;
import com.sun.tools.attach.VirtualMachineDescriptor;

/**
 * The class collects call stack data from the VM
 */
public class CallStackAnalyzer {
    
    /**
     * Constants
     */
    private static final Log LOGGER = LogFactory.getLog(CallStackAnalyzer.class);
    
    private static final String NL = System.getProperty("line.separator");
    
    private static final String INVALID_PROCESS_ID = "----";
    
    /**
     * Attributes
     */
    private static String currentProcessID = INVALID_PROCESS_ID;
    
    private static String newProcessID = "";
    
    protected static CopyOnWriteArrayList<Integer> allVirtualMachines = new CopyOnWriteArrayList<Integer>();
    
    protected Model model = null;
    
    /**
     * Constructor
     */
    public CallStackAnalyzer(Model model) {
        this.model = model;
    }
    
    public void start() {
        
        HotSpotVirtualMachine hsVm = null;
        do {
            
            try {
                
                if (allVirtualMachines.size() == 0) {
                    
                    findOtherAttachableJavaVMs();
                    LOGGER.debug("VirtualMachines=" + allVirtualMachines);
                    /*
                    if (!allVirtualMachines.isEmpty()) {
                        newProcessID = allVirtualMachines.get(0).toString();
                        LOGGER.debug("Select pid=" + currentProcessID);
                        model.setConnected(true);
                    }*/
                    if (!allVirtualMachines.isEmpty()) {
//                      String TargetMainClassName = "com.sw_engineering_candies.yaca.YacaAgentTestClient";
                        String TargetMainClassName = "org.apache.catalina.startup.Bootstrap";
                        newProcessID = getTargetProcessIDInVM(TargetMainClassName);
                        if ("".equals(newProcessID))
                            newProcessID = allVirtualMachines.get(0).toString();
                        LOGGER.debug("Select pid=" + currentProcessID);
                        model.setConnected(true);
                    }
                }
                
                getProcessIDInVM();
                if (!currentProcessID.equals(newProcessID)) {
                    LOGGER.info("Request change to pid=" + newProcessID + " allVirtualMachines=" + allVirtualMachines);
                    // Attach to new virtual machine
                    hsVm = (HotSpotVirtualMachine) VirtualMachine.attach(newProcessID);
                    model.setActiveProcess(newProcessID);
                    model.reset();
                    currentProcessID = newProcessID;
                    model.setConnected(true);
                }
                
                if (model.isConnected()) {
                    
                    // Update filter white list
//                    final String filterWhite = "((y|Y)aca|(s|S)ort)";
//                    final String filterBlack = "(eclipse|zeroturnaround)";
//                    final String filterWhite = "((m|M)ountain|Exception|cmmn|supporters)";
//                    final String filterBlack = "(eclipse|zeroturnaround)";
                    final String filterWhite = model.getFilterWhiteList();
                    final String filterBlack = model.getFilterBlackList();
                    
                    final Pattern patternWhiteList = Pattern.compile(filterWhite);
                    final Pattern patternBlackList = Pattern.compile(filterBlack);
                    
                    try {
                        final List<Node> entryList = new ArrayList<Node>(10);
                        final InputStream in = hsVm.remoteDataDump(new Object[0]);
                        final BufferedReader br = new BufferedReader(new InputStreamReader(in));
                        String line = "";
                        while ((line = br.readLine()) != null) {
                            if (line.startsWith("\tat ") && line.length() > 10) {
                                final String fullMethodName = line.substring(4, line.lastIndexOf('(')).trim();
                                if (filterWhite.isEmpty() || patternWhiteList.matcher(fullMethodName).find()) {
                                    if (filterBlack.isEmpty() || !patternBlackList.matcher(fullMethodName).find()) {
                                        LOGGER.info(line);
                                        final String[] split = fullMethodName.split("\\.");
                                        if (split.length > 2) {
                                            final int indexOfMethodName = split.length - 1;
                                            final int indexOfClassName = indexOfMethodName - 1;
                                            final StringBuffer packageName = new StringBuffer(line.length());
                                            packageName.append(split[0]);
                                            for (int i = 1; i < indexOfClassName; i++) {
                                                packageName.append('.').append(split[i]);
                                            }
                                            
                                            String className = split[indexOfClassName];
                                            String packageString = packageName.toString();
                                            final Node entry = new Node();
                                            String methodName = split[indexOfMethodName];
                                            entry.setMethodName(methodName);
                                            entry.setClassName(className);
                                            entry.setPackageName(packageString);
                                            entry.setNewItem(true);
                                            entryList.add(entry);
                                            
                                            LOGGER.debug("line='" + line + "'" + NL + "  packageString='" + packageString + NL + "  className='"
                                                    + className + NL + "  methodName='" + methodName + "'");
                                        } else {
                                            LOGGER.warn("Can't process line '" + line + "'");
                                        }
                                    }
                                }
                            }
                        }
                        model.append(entryList, true, true);
                        
                        br.close();
                        in.close();
                        
                    } catch (final IOException e) {
                        LOGGER.debug("IOException " + e.getMessage());
                        model.setConnected(false);
                    }
                }
                
                try {
                    Thread.sleep(10);
                } catch (InterruptedException e) {
                    LOGGER.error("Wait problem ", e);
                }
                
            } catch (final AttachNotSupportedException e) {
                if (model.isConnected()) {
                    LOGGER.error("AttachNotSupportedException ", e);
                }
                model.reset();
            } catch (IOException e) {
                LOGGER.error("IOException " + e.getMessage());
                model.reset();
            }
        } while (true);
    }
    
    public synchronized static List<Integer> findOtherAttachableJavaVMs() {
        
        allVirtualMachines.clear();
        
        List<VirtualMachineDescriptor> vmDesc = VirtualMachine.list();
        for (int i = 0; i < vmDesc.size(); i++) {
            VirtualMachineDescriptor descriptor = vmDesc.get(i);
            
            final String nextPID = descriptor.id();
            
            final String ownPID = ManagementFactory.getRuntimeMXBean().getName().split("@")[0];
            if (!ownPID.equals(nextPID)) {
                
                final StringBuilder message = new StringBuilder();
                message.append("Process ID=").append(nextPID).append(NL);
                
                VirtualMachine vm;
                try {
                    vm = VirtualMachine.attach(descriptor);
                    
                    Properties props = vm.getSystemProperties();
                    message.append("   java.version=").append(props.getProperty("java.version")).append(NL);
                    message.append("   java.vendor=").append(props.getProperty("java.vendor")).append(NL);
                    message.append("   java.home=").append(props.getProperty("java.home")).append(NL);
                    message.append("   sun.arch.data.model=").append(props.getProperty("sun.arch.data.model")).append(NL);
                    
                    Properties properties = vm.getAgentProperties();
                    Enumeration<Object> keys = properties.keys();
                    while (keys.hasMoreElements()) {
                        Object elementKey = keys.nextElement();
                        message.append("   ").append(elementKey).append("=").append(properties.getProperty(elementKey.toString())).append(NL);
                    }
                    LOGGER.debug(message);
                    vm.detach();
                    
                    int processId = Integer.parseInt(nextPID);
                    allVirtualMachines.add(processId);
                } catch (AttachNotSupportedException e) {
                    LOGGER.error(e.getMessage());
                } catch (IOException e) {
                    LOGGER.error(e.getMessage());
                }
            }
        }
        Collections.sort(allVirtualMachines);
        Collections.reverse(allVirtualMachines);
        return allVirtualMachines;
    }
    
    public synchronized static void setProcessNewID(String processIdNew) {
        String value = processIdNew.trim();
        try {
            Integer.valueOf(value);
            LOGGER.info("Set new process id=" + value);
            CallStackAnalyzer.newProcessID = value;
        } catch (Exception ex) {
            LOGGER.error("Invalid id=" + value);
        }
    }
    
    private synchronized String getTargetProcessIDInVM(String classFullName){
        String pid = "";
        try {
            // Checking for local Host, one can do for remote machine as well
            MonitoredHost local = MonitoredHost.getMonitoredHost("localhost");
            // Take all active VM's on Host, LocalHost here
            Set<Integer> vmlist = new HashSet<>(local.activeVms());
            for (Integer id : vmlist) {
                // 1234 - Specifies the Java Virtual Machine identified by lvmid 1234 
                // on an unnamed host. This string is transformed into the absolute 
                // form //1234, which must be resolved against a HostIdentifier.
                MonitoredVm vm = local.getMonitoredVm(new VmIdentifier(String.format("//%d", id)));
                // take care of class file and jar file both
                String processname = MonitoredVmUtil.mainClass(vm, true);
                if (processname.startsWith(classFullName)){
                    pid = id.toString();
                    System.out.printf("//-- %d: %s%n", id, processname);
                }
            }
        }catch (URISyntaxException ue){
        }catch (MonitorException me){}
        return pid;
    }
    private synchronized void getProcessIDInVM(){
        String pid = "";
        try {
            MonitoredHost local = MonitoredHost.getMonitoredHost("localhost");
            Set<Integer> vmlist = new HashSet<>(local.activeVms());
            for (Integer id : vmlist) {
                MonitoredVm vm = local.getMonitoredVm(new VmIdentifier(String.format("//%d", id)));
                String processname = MonitoredVmUtil.mainClass(vm, true);
//                System.out.printf("//-- %d: %s%n", id, processname);
            }
        }catch (URISyntaxException ue){
        }catch (MonitorException me){}
    }
    protected synchronized static String getMainClassById(String pid){
        try {
            MonitoredHost local = MonitoredHost.getMonitoredHost("localhost");
            MonitoredVm vm = local.getMonitoredVm(new VmIdentifier(String.format("//%d", pid)));
            return MonitoredVmUtil.mainClass(vm, true);
        }
        catch (URISyntaxException ue){}
        catch (MonitorException me){}
        return "";
    }
}
