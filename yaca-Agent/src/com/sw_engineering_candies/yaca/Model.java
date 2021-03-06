/*
 * Copyright (C) 2012-2014, Markus Sprunck <sprunck.markus@gmail.com>
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

import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.Vector;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import sun.jvmstat.monitor.MonitorException;
import sun.jvmstat.monitor.MonitoredHost;
import sun.jvmstat.monitor.MonitoredVm;
import sun.jvmstat.monitor.MonitoredVmUtil;
import sun.jvmstat.monitor.VmIdentifier;

/**
 * The class collects data from dynamic code analysis and provides the result in
 * the JSON format
 */
public class Model {
    
    /**
     * Constants
     */
    private static final Log LOGGER = LogFactory.getLog(Model.class);
    private static final String NL = System.getProperty("line.separator");
    private static final int EXPECTED_NUMBER_OF_LINKS = 10000;
    private static final int EXPECTED_NUMBER_OF_CLUSTERS = 1000;
    private static final int EXPECTED_NUMBER_OF_NODES = 10000;
    
    /**
     * The map stores all created nodes
     */
    private final Map<String, String> nodes = new HashMap<String, String>(EXPECTED_NUMBER_OF_NODES);
    
    /**
     * The list nodeIds is used to find the correct ids for the creation of the
     * JSON file
     */
    private final List<String> nodeIds = new Vector<String>(EXPECTED_NUMBER_OF_NODES);
    
    /**
     * The list clusterIds is used to find the correct ids for the creation of
     * the JSON file
     */
    private final List<String> clusterIds = new Vector<String>(EXPECTED_NUMBER_OF_CLUSTERS);
    
    /**
     * The list clusterIds is used to find the correct ids for the creation of
     * the JSON file
     */
    private final List<String> linkIds = new Vector<String>(EXPECTED_NUMBER_OF_LINKS);
    
    /**
     * The map links all created links
     */
    private final Map<String, String> links = new HashMap<String, String>(EXPECTED_NUMBER_OF_LINKS);
    
    /**
     * The list is used to count the finding of each link
     */
    private final Map<String, Long> nodesCount = new HashMap<String, Long>(EXPECTED_NUMBER_OF_NODES);
    
    /**
     * Used to find the maximal count of a node, to scale all nodes to a
     * reasonable range
     */
    private long maximumNodeCount = 1L;
    
    /**
     * Allocate right size for StringBuffer
     */
    private int lastLength = 1000;
    
    /**
     * Id of the current active process
     */
    private String activeProcess = "----";
    
    /**
     * This filter is used in analyzer-task
     */
    private String filterWhiteList = "";
    
    /**
     * This filter is used in analyzer-task
     */
    private String filterBlackList = "";
    
    /**
     * Is analyzer connected
     */
    private boolean isConnected = false;
    
    public synchronized boolean isConnected() {
        return isConnected;
    }
    
    public synchronized void setConnected(boolean isConnected) {
        this.isConnected = isConnected;
    }
    
    /**
     * Method updateLinks analyzes the call stack of all threads and collects
     * the data in the class ResultData.
     */
    public synchronized void append(final List<Node> entryList, final boolean countNodes, final boolean countLinks) {
        final int maxIndex = entryList.size() - 1;
        if (maxIndex > 0) {
            for (int i = 0; i < maxIndex; i++) {
//              addAndLogging(entryList.get(i), entryList.get(i + 1), countNodes, countLinks);
                add(entryList.get(i), entryList.get(i + 1), countNodes, countLinks);
            }
        }
    }
    
    public synchronized void setActiveProcess(String processId) {
        this.activeProcess = processId;
    }
    
    public synchronized void reset() {
        resetCouters();
        nodes.clear();
        nodeIds.clear();
        clusterIds.clear();
        linkIds.clear();
        links.clear();
        nodesCount.clear();
        LOGGER.info("Reset counters and clear model");
    }
    
    public synchronized String getJSONPModel() {
        
        final StringBuffer fw = new StringBuffer(lastLength + 1000);
        
        final List<String> nodeskeys = new Vector<String>();
        nodeskeys.addAll(nodes.keySet());
        
        fw.append("{" + NL);
        
        fw.append("\"nodes\":[");
        fw.append(NL);
        boolean isFrist = true;
        for (int index = 0; index < nodeIds.size(); index++) {
            final String key = nodeIds.get(index);
            if (nodes.containsKey(key)) {
                fw.append((isFrist ? "" : "," + NL) + "");
                isFrist = false;
                long nodeActivity = (long) ((double) nodesCount.get(key) * 1000.0f) / maximumNodeCount;
                fw.append(String.format(Locale.ENGLISH, nodes.get(key), nodeActivity));
            }
        }
        fw.append(NL + "],");
        fw.append(NL);
        
        fw.append("\"links\":[");
        fw.append(NL);
        isFrist = true;
        for (final String key : linkIds) {
            if (links.containsKey(key)) {
                fw.append((isFrist ? "" : "," + NL) + "");
                isFrist = false;
                fw.append(links.get(key));
            }
        }
        fw.append(NL + "]}");
        fw.append(NL);
        
        final StringBuffer message = new StringBuffer(200);
        message.append("Process ID=").append(activeProcess);
        message.append(" clusters=").append(clusterIds.size());
        message.append(" nodes=").append(nodeIds.size());
        message.append(" links=").append(links.size());
        message.append(" maximumNodeCount=").append(maximumNodeCount);
        message.append(" connected=" + isConnected);
        LOGGER.info(message);
        
        resetCouters();
        lastLength = fw.length();
        return fw.toString();
    }
    
    public synchronized String getJSONPVM() {
        
        final StringBuffer fw = new StringBuffer(1000);
        fw.append("{" + NL);
        List<Integer> processIDs = CallStackAnalyzer.allVirtualMachines;
        fw.append("\"process_id_available\":[");
        fw.append(NL);
        boolean isFrist = true;
        for (int index = 0; index < processIDs.size(); index++) {
            final String pid = processIDs.get(index).toString();
            fw.append((isFrist ? "    " : ",") + "");
            isFrist = false;
            fw.append(pid);
//          fw.append(pid + ":" + CallStackAnalyzer.getMainClassById(pid));
        }
        fw.append(NL + "],");
        fw.append(NL);
        fw.append("\"process_id_active\":\"" + this.activeProcess + "\"" + NL);
        fw.append(NL + "}");
        fw.append(NL);
        
        final StringBuffer message = new StringBuffer(200);
        message.append("Process ID=").append(activeProcess);
        message.append(" process IDs=").append(processIDs.toString());
        LOGGER.info(message);
        
        return fw.toString();
    }

    /**
     * a little changed method for logging
     * @param targetEntry
     * @param sourceEntry
     * @param countNodes
     * @param countLinks
     * 
     * @author windy at 2018.03.10.SAT.AM 11:20
     */
    static String LOG_LEBEL   = "ALL";
    static String tab1        = "\t";
    static String existPrt    = tab1 + tab1 + "%s exists. key=[%s]";
    static String existNodPrt = tab1 + tab1 + "nodes.n%s exists.";
    static String existLnkPrt = tab1 + tab1 + "links.ln%s exists.";

    static boolean cflg = true;
    static String TClsPrt     = "TCluster_%d. tgt-cluster.key =%s";
    static String SClsPrt     = "SCluster_%d. src-cluster.key =%s";
    static String nodePrt     = tab1 + tab1 + "nodes.n%d =%s";
    
    static boolean nflg = true;
    static String TNodePrt    = tab1 + "tgt.n%d. node =%s";
    static String SNodePrt    = tab1 + "src.n%d. node =%s";
    static String LnkPrt      = tab1 + "%s tgtn%d <- srcn%d, link =%s";
//  private static String linkPrt     = tab1 + tab1 + "links.n%d =%s";
    
//  private boolean filtering  = true;
//  private String[] watchLst  = {};
//  private String[] exceptLst = {"org.eclipse", "org.zeroturnaround", "com.zeroturnaround"};
    
    private static void prtmsg(String formatStr, Object... args){
        if (LOG_LEBEL.equals("ALL")){
        LOGGER.info(String.format(formatStr, args));
        }
    }
    private void addAndLogging(final Node targetEntry, final Node sourceEntry, final boolean countNodes, final boolean countLinks) {
        System.out.println();
        
        // Add target cluster
        final String targetClusterKey = getClusterKey(targetEntry); // key = Node.packageName.className
        // Add source cluster
        final String sourceClusterKey = getClusterKey(sourceEntry);

//        if(filtering){
//            for(String filterStr : exceptLst){
//                if(targetClusterKey.contains(filterStr)){
//                    return;
//                }
//                if(sourceClusterKey.contains(filterStr)){
//                    return;
//                }
//            }
//        }

        if (!clusterIds.contains(targetClusterKey)) {
            clusterIds.add(targetClusterKey);
            if(cflg) prtmsg(TClsPrt, clusterIds.indexOf(targetClusterKey), targetClusterKey);
        } else if(cflg) prtmsg(existPrt, "TCluster_"+clusterIds.indexOf(targetClusterKey), targetClusterKey);
        
        // Add target cluster node
        if (!nodeIds.contains(targetClusterKey)) {
            nodeIds.add(targetClusterKey);
            String nodeString = "\t{\"id\":" + nodeIds.indexOf(targetClusterKey) + ", \"clusterId\":" + clusterIds.indexOf(targetClusterKey)
                    + ", \"name\":\"" + targetClusterKey + "\" , \"alias\":\"" + targetEntry.getPackageName()
                    + "\", \"calls\": %d , \"isClusterNode\" : true }";
            nodes.put(targetClusterKey, nodeString);
            incrementNodeCount(targetClusterKey);
            if(cflg) prtmsg(nodePrt, nodeIds.indexOf(targetClusterKey), nodeString);
        } else if(cflg) prtmsg(existNodPrt, nodeIds.indexOf(targetClusterKey));
        
        if (!clusterIds.contains(sourceClusterKey)) {
            clusterIds.add(sourceClusterKey);
            if(cflg) prtmsg(SClsPrt, clusterIds.indexOf(sourceClusterKey), sourceClusterKey);
        } else if(cflg) prtmsg(existPrt, "SCluster_"+clusterIds.indexOf(sourceClusterKey), sourceClusterKey);
        
        // Add source cluster node
        if (!nodeIds.contains(sourceClusterKey)) {
            nodeIds.add(sourceClusterKey);
            String nodeString = "\t{\"id\":" + nodeIds.indexOf(sourceClusterKey) + ", \"clusterId\":" + clusterIds.indexOf(sourceClusterKey)
                    + ", \"name\":\"" + sourceClusterKey + "\" , \"alias\":\"" + sourceEntry.getPackageName()
                    + "\", \"calls\": %d , \"isClusterNode\" : true }";
            nodes.put(sourceClusterKey, nodeString);
            incrementNodeCount(sourceClusterKey);
            if(cflg) prtmsg(nodePrt, nodeIds.indexOf(sourceClusterKey), nodeString);
        } else if(cflg) prtmsg(existNodPrt, nodeIds.indexOf(sourceClusterKey));

        // Add target node
        final String targetKey = getNodeKey(targetEntry);
        if (!nodeIds.contains(targetKey)) {
            nodeIds.add(targetKey);
        } else if(nflg) prtmsg(existNodPrt, nodeIds.indexOf(targetKey));

        String nodeString = "\t{\"id\":" + nodeIds.indexOf(targetKey) + ", \"clusterId\":" + clusterIds.indexOf(targetClusterKey) + ", \"name\":\""
                + targetKey + "\" , \"alias\":\"" + targetEntry.getClassName() + '.' + targetEntry.getMethodName()
                + "\", \"calls\": %d , \"isClusterNode\" : false  }";
        nodes.put(targetKey, nodeString);
        incrementNodeCount(targetKey);
        if(nflg) prtmsg(TNodePrt, nodeIds.indexOf(targetKey), nodeString);
        
        // Add source node
        final String sourceKey = getNodeKey(sourceEntry);
        if (!nodeIds.contains(sourceKey)) {
            nodeIds.add(sourceKey);
        } else if(nflg) prtmsg(existNodPrt, nodeIds.indexOf(targetKey));

        nodeString = "\t{\"id\":" + nodeIds.indexOf(sourceKey) + ", \"clusterId\":" + clusterIds.indexOf(sourceClusterKey) + ", \"name\":\""
                + sourceKey + "\" , \"alias\":\"" + sourceEntry.getClassName() + '.' + sourceEntry.getMethodName()
                + "\", \"calls\": %d , \"isClusterNode\" : false }";
        nodes.put(sourceKey, nodeString);
        incrementNodeCount(sourceKey);
        if(nflg) prtmsg(SNodePrt, nodeIds.indexOf(sourceKey), nodeString);
        
        // Add node link
        final String keyLink = targetKey + "<-" + sourceKey;
        if (!linkIds.contains(keyLink)) {
            linkIds.add(keyLink);
        } else if(nflg) prtmsg(existLnkPrt, linkIds.indexOf(keyLink));

        nodeString = "\t{\"id\":" + linkIds.indexOf(keyLink) + ", \"sourceId\":" + nodeIds.indexOf(sourceKey) 
                + ", \"targetId\":" + nodeIds.indexOf(targetKey) + ", \"isClusterLink\" : false }";
        links.put(keyLink, nodeString);
        if(nflg) prtmsg(LnkPrt, "Nod_ln"+linkIds.indexOf(keyLink), nodeIds.indexOf(targetKey), nodeIds.indexOf(sourceKey), targetKey + "  <-" + sourceKey);
        //"NodLnk_n%d. srcn%d_to_tgtn%d, key =%s";
        
        // Add cluster link
        final String keyLink11 = targetClusterKey + "<-" + targetKey;
        if (!linkIds.contains(keyLink11)) {
            linkIds.add(keyLink11);
        } else if(nflg) prtmsg(existLnkPrt, linkIds.indexOf(keyLink11));

        nodeString = "\t{\"id\":" + linkIds.indexOf(keyLink11) + ", \"sourceId\":" + nodeIds.indexOf(targetKey) 
                + ", \"targetId\":" + nodeIds.indexOf(targetClusterKey) + ", \"isClusterLink\" : true }";
        links.put(keyLink11, nodeString);
        if(nflg) prtmsg(LnkPrt, "Cls_ln"+linkIds.indexOf(keyLink11), nodeIds.indexOf(targetClusterKey), nodeIds.indexOf(targetKey), targetClusterKey + "  <-" + targetKey);
        //"ClsLnk_n%d. srcn%d_to_tgtn%d, key =%s";
    }
    
    /**
     * original method
     * @param targetEntry
     * @param sourceEntry
     * @param countNodes
     * @param countLinks
     */
    private void add(final Node targetEntry, final Node sourceEntry, final boolean countNodes, final boolean countLinks) {
        
        // Add target cluster
        final String targetClusterKey = getClusterKey(targetEntry); // key = Node.packageName.className
        if (!clusterIds.contains(targetClusterKey)) {
            clusterIds.add(targetClusterKey);
        }
        // Add target cluster node
        if (!nodeIds.contains(targetClusterKey)) {
            nodeIds.add(targetClusterKey);
            String nodeString = "\t{\"id\":" + nodeIds.indexOf(targetClusterKey) + ", \"clusterId\":" + clusterIds.indexOf(targetClusterKey)
                    + ", \"name\":\"" + targetClusterKey + "\" , \"alias\":\"" + targetEntry.getPackageName()
                    + "\", \"calls\": %d , \"isClusterNode\" : true }";
            nodes.put(targetClusterKey, nodeString);
            incrementNodeCount(targetClusterKey);
            LOGGER.info(nodeString);
        }
        
        // Add source cluster
        final String sourceClusterKey = getClusterKey(sourceEntry);
        if (!clusterIds.contains(sourceClusterKey)) {
            clusterIds.add(sourceClusterKey);
        }
        
        // Add source cluster node
        if (!nodeIds.contains(sourceClusterKey)) {
            nodeIds.add(sourceClusterKey);
            String nodeString = "\t{\"id\":" + nodeIds.indexOf(sourceClusterKey) + ", \"clusterId\":" + clusterIds.indexOf(sourceClusterKey)
                    + ", \"name\":\"" + sourceClusterKey + "\" , \"alias\":\"" + sourceEntry.getPackageName()
                    + "\", \"calls\": %d , \"isClusterNode\" : true }";
            nodes.put(sourceClusterKey, nodeString);
            incrementNodeCount(sourceClusterKey);
            LOGGER.info(nodeString);
        }

        // Add target node
        final String targetKey = getNodeKey(targetEntry);
        if (!nodeIds.contains(targetKey)) {
            nodeIds.add(targetKey);
        }

        String nodeString = "\t{\"id\":" + nodeIds.indexOf(targetKey) + ", \"clusterId\":" + clusterIds.indexOf(targetClusterKey) + ", \"name\":\""
                + targetKey + "\" , \"alias\":\"" + targetEntry.getClassName() + '.' + targetEntry.getMethodName()
                + "\", \"calls\": %d , \"isClusterNode\" : false  }";
        nodes.put(targetKey, nodeString);
        incrementNodeCount(targetKey);
        
        // Add source node
        final String sourceKey = getNodeKey(sourceEntry);
        if (!nodeIds.contains(sourceKey)) {
            nodeIds.add(sourceKey);
        }

        nodeString = "\t{\"id\":" + nodeIds.indexOf(sourceKey) + ", \"clusterId\":" + clusterIds.indexOf(sourceClusterKey) + ", \"name\":\""
                + sourceKey + "\" , \"alias\":\"" + sourceEntry.getClassName() + '.' + sourceEntry.getMethodName()
                + "\", \"calls\": %d , \"isClusterNode\" : false }";
        nodes.put(sourceKey, nodeString);
        incrementNodeCount(sourceKey);
        
        // Add node link
        final String keyLink = targetKey + "<-" + sourceKey;
        if (!linkIds.contains(keyLink)) {
            linkIds.add(keyLink);
        }

        nodeString = "\t{\"id\":" + linkIds.indexOf(keyLink) + ", \"sourceId\":" + nodeIds.indexOf(sourceKey) + ", \"targetId\":"
                + nodeIds.indexOf(targetKey) + ", \"isClusterLink\" : false }";
        links.put(keyLink, nodeString);
        
        // Add cluster link
        final String keyLink11 = targetClusterKey + "<-" + targetKey;
        if (!linkIds.contains(keyLink11)) {
            linkIds.add(keyLink11);
        }

        nodeString = "\t{\"id\":" + linkIds.indexOf(keyLink11) + ", \"sourceId\":" + nodeIds.indexOf(targetKey) + ", \"targetId\":"
                + nodeIds.indexOf(targetClusterKey) + ", \"isClusterLink\" : true }";
        links.put(keyLink11, nodeString);
    }
    
    private void incrementNodeCount(final String keyNode) {
        long value = 0L;
        if (nodesCount.containsKey(keyNode)) {
            value = nodesCount.get(keyNode) + 1L;
        }
        maximumNodeCount = Math.max(maximumNodeCount, value);
        nodesCount.put(keyNode, value);
    }
    
    private void resetCouters() {
        for (final String key : nodesCount.keySet()) {
            nodesCount.put(key, 0L);
        }
        maximumNodeCount = 1L;
    }
    
    private String getNodeKey(Node item) {
        return item.getPackageName() + '.' + item.getClassName() + '.' + item.getMethodName();
    }
    
    private String getClusterKey(Node item) {
        return item.getPackageName() + '.' + item.getClassName();
    }
    
    public synchronized String getFilterBlackList() {
        return filterBlackList;
    }
    
    public synchronized void setFilterBlackList(String filterBlackList) {
        LOGGER.info("Set filterBlackList=" + filterBlackList);
        this.filterBlackList = filterBlackList;
    }
    
    public synchronized String getFilterWhiteList() {
        return filterWhiteList;
    }
    
    public synchronized void setFilterWhiteList(String filterWhiteList) {
        LOGGER.info("Set filterWhiteList=" + filterWhiteList);
        this.filterWhiteList = filterWhiteList;
    }
    
}
