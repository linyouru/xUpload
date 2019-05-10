package com.example.xupload.entity;

import org.springframework.web.multipart.MultipartFile;


/**
 * 上传分片参数接收实体类
 * @ClassName BlockParams
 * @Description
 * @Author LYR
 * @Date 2019/3/11 15:34
 * @Version 1.0
 **/
public class BlockParams {

    private String md5;
    private String saveName;
    private String id;
    private String name;
    private String type;
    private String lastModifiedDate;
    private int size;
    private String chunks;
    private String chunk;
    private MultipartFile file;

    public BlockParams() {
    }

    public String getSaveName() {
        return saveName;
    }

    public void setSaveName(String saveName) {
        this.saveName = saveName;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getLastModifiedDate() {
        return lastModifiedDate;
    }

    public void setLastModifiedDate(String lastModifiedDate) {
        this.lastModifiedDate = lastModifiedDate;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public String getChunks() {
        return chunks;
    }

    public void setChunks(String chunks) {
        this.chunks = chunks;
    }

    public String getChunk() {
        return chunk;
    }

    public void setChunk(String chunk) {
        this.chunk = chunk;
    }

    public MultipartFile getFile() {
        return file;
    }

    public void setFile(MultipartFile file) {
        this.file = file;
    }

    public String getMd5() {
        return md5;
    }

    public void setMd5(String md5) {
        this.md5 = md5;
    }

    @Override
    public String toString() {
        return "BlockParams{" +
                "saveName='" + saveName + '\'' +
                ", id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", type='" + type + '\'' +
                ", lastModifiedDate='" + lastModifiedDate + '\'' +
                ", size=" + size +
                ", chunks=" + chunks +
                ", chunk=" + chunk +
                ", file=" + file +
                '}';
    }
}
