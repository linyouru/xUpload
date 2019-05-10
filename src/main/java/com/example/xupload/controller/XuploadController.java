package com.example.xupload.controller;

import com.example.xupload.entity.BlockParams;
import com.example.xupload.utils.XuploadUtil;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import java.io.*;
import java.nio.channels.FileChannel;
import java.util.ArrayList;
import java.util.Arrays;

/**
 * xupload后台代码,完成检验分片，上传文件，合并分片功能；
 * @ClassName XuploadController
 * @Description
 * @Author LYR
 * @Date 2019/3/11 14:44
 * @Version 1.0
 **/
@RestController
public class XuploadController {

    private String basePath;

    public static String FILE_PATH;

    /**
     * 配置的文件上传路径
     * @Author chengpunan
     * @Description //TODO
     * @Date 17:01 2019/3/12
     * @Param [file_path]
     * @return void
     **/
    @Value("${FILE_PATH}")
    public void setFILE_PATH(String file_path){
        FILE_PATH = file_path;
    }
    /**
     * 检查文件是否以分片上传、是否未上传完成
     * @Author chengpunan
     * @Description //TODO
     * @Date 15:31 2019/3/12
     * @Param [md5, saveName, request]
     * @return java.lang.String
     **/
    @RequestMapping("/uploadFile-checkblock")
    public String checkBlock(String md5,String saveName,HttpServletRequest request) throws Exception {
//        思路：
//        1、遍历upload下的文件，if(文件名=saveName)
//            Y：直接返回all
//            N：进入2
//        2、if(文件名=md5)值则说明上某文件存在分片；遍历该文件夹下的分片，获取分片名组成返回值[0,1,2,3,5];
//        3、若没有文件匹配得上，返回[];
        basePath = request.getSession().getServletContext().getRealPath("");
        StringBuffer stringBuffer = new StringBuffer("[");
        //遍历upload文件夹
        File uploadFile = new File(basePath+FILE_PATH);
        if (uploadFile.exists()) {
            File[] files = uploadFile.listFiles();
            for (File file : files) {
                if (file.getName().equals(saveName)){   //已上传文件;
                    return "all";
                }else if(file.getName().equals(md5)){   //存在分片文件夹;
                    String[] blockList = file.list();
                    for (String blockFile : blockList) {
                        stringBuffer.append(blockFile+",");
                    }
                    stringBuffer.append("]");
                    return stringBuffer.toString();
                }
            }
        } else {
            throw new Exception("存储路径不存在，请检查配置文件");
        }
        return "[]";
    }

    /**
     * 文件上传
     * @Author chengpunan
     * @Description //TODO
     * @Date 15:32 2019/3/12
     * @Param [request, params]
     * @return java.lang.String
     **/
    @RequestMapping("/uploadFile")
    public String uploadFile(BlockParams params) throws IOException {
//        思路：
//            1.根据参数chunks判断是否分片
//                Y:
//                N:直接保存,返回
//            2.判断保存分片的文件夹是否存在，不存在就创建一个
//                Y:保存即可(文件夹以MD5命名，文件以分片号命名)

        MultipartFile file = params.getFile();
        if(params.getChunks()==null){  //未分片文件
            File targetFile = new File(basePath+FILE_PATH+params.getSaveName());
            if(!targetFile.getParentFile().exists()){
                targetFile.getParentFile().mkdirs();    //创建路径
            }
            file.transferTo(targetFile);
            return "文件未分割，上传成功";
        }else { //文件分片
            File blockFileDir = new File(basePath+FILE_PATH+params.getMd5()+"/"+params.getChunk());
            if (!blockFileDir.getParentFile().exists()){
                blockFileDir.getParentFile().mkdirs();
            }
            file.transferTo(blockFileDir);
            return "文件分割，"+params.getChunk()+"/"+params.getChunks()+"上传成功";
        }
    }

    /**
     * 合并分片
     * @Author chengpunan
     * @Description //TODO
     * @Date 15:35 2019/3/12
     * @Param [md5, saveName]
     * @return void
     **/
    @RequestMapping("/uploadFile-mergeblock")
    public String mergeBlock(String md5,String saveName) throws Exception {
//        思路：
//            1、获取分片集合，按分片号排序；
//            2、读取分片内容，写入一个文件中，文件以MD5值命名；
//            3、删除分片文件夹及文件。

        //分片文件夹路径
        String path = basePath+FILE_PATH+md5;
        File dir = new File(path);
        File[] Files = dir.listFiles();
        if(Files.length>0){
            //排序
            ArrayList<File> blockFiles = new ArrayList<>(Arrays.asList(Files));
            blockFiles.sort((o1, o2) -> {
                String o1Name = o1.getName();
                String o2Name = o2.getName();
                if (Integer.parseInt(o1Name) < Integer.parseInt(o2Name)) {
                    return -1;
                }
                return 1;
            });
            //目标文件
            File targetFile = new File(basePath+FILE_PATH+saveName);
            FileChannel outChannel = new FileOutputStream(targetFile).getChannel();
            FileChannel inputChannel;
            for (File blockFile : blockFiles) {
                inputChannel = new FileInputStream(blockFile).getChannel();
                inputChannel.transferTo(0, inputChannel.size(), outChannel);
                inputChannel.close();
                //删除分片
                blockFile.delete();
            }
            outChannel.close();
            //删除分片文件夹
            FileUtils.deleteDirectory(dir);
        }else {
            throw new Exception("分片文件夹下无文件，请检查");
        }
        return "分片合并成功";
    }

}
