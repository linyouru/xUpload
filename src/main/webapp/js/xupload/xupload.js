/*
文件上传插件
时间:2019-03-10
作者：myth小艾
版本：v1.0.0
依赖：webuploader  http://fex.baidu.com/webuploader/doc/index.html
引用顺序
   css:
         |-webuploader.css
         |-xupload.css.css
   js:
         |-webuploader.js
         |-xuploadbox.js//多个实例公用一个弹出盒子对象
         |-xupload.js//上传插件webuploader包裹js
插件特色
   1.支持大文件断点续传--需实现三个后台接口
   2.支持大文件(文件库中md5比对存在的文件)秒传--需实现三个后台接口
   3.支持多文件上传实例集体控制，支持单文件可控(可删除，可暂停)
   4.支持webuploader参数配置和事件
   5.支持插件无感化运行
   6.支持截屏后的图片粘贴即可添加到上传列表
   7.支持文件拖拽
调用方式
1.js调用
  var xupload = new Xupload({
      pick: {
        id: "#js_xupload"
      },
      server: '/uploadFile'
    })
//上传  xupload.upload();
2.标签调用方式
<div id="js_xupload3" class="js_xupload" data-server="/uploadFile"></div>
需要手动调用上传方法的对象实例挂载在dom.xupload对象上
//上传 dom.xupload.upload();

参数配置:
uploadSuccessHtml:Fn(file) 每个文件成功后回显到页面上的html  默认值为  回调参数为file
 uploadSuccessHtml:function(file){
    return `
       <li class="list-group-item animated fadeIn">
        <div class="file-info">
          <i class="file-icon ${xuploadbox.getIconByfile(file.type,file.name)}"></i>
          <span class="file-name">${file.name}</span>
          <span class="file-size">(${WebUploader.formatSize(file.size)})</span>
        </div>
        <div class="file-opts">
          <a href="javascript:;" class="js_upload_remove" data-id="${file.id}"><i class="glyphicon glyphicon-remove"></i></a>
        </div>
      </li>
    `
  },
 backshowList:[Object]  页面初始化需要回显的对象  其中需要有3个key需要有
 {
   id:文件id  用来做操作的传参  默认模板里的  $(".js_upload_remove").data("id")可获取到  也可以通过该值做代理事件触发传值
   name:文件名   注：icon是根据文件名后缀变化的哦~
   size:文件大小
 }
其他配置
可以参考http://fex.baidu.com/webuploader/doc/index.html#WebUploader_Uploader_option


 事件监听和方法调用都可调用WebUploader的事件完成
 xupload.on('uploadSuccess',file=>{
  console.log("上传成功")
});
 
 
 1.检查分片
 http://localhost:8086/uploadFile-checkblock
 request
 {
   验证md5
   md5: 31449889e8fff191b8828ecb1d159e5c
   上传的文件是否已经存在了
  saveName: 31449889e8fff191b8828ecb1d159e5c.jpeg
 }
 
 response
 返回三种情况
 [] 没上传
 "all"  已经上传过了
 [0,1,2,3,5]  上传部分
 
 2.上传
 
 http://localhost:8086/uploadFile
 没有达到分片最小size
   request
   {
  id: WU_FILE_0
  name: 1.jpeg
  type: image/jpeg
  lastModifiedDate: Wed Jan 23 2019 10:11:00 GMT 0800 (中国标准时间)
  size: 87904
  file: (binary)
   }
 达到分片最小分片size
 {
   md5: 28e9e2f90bff1ecaf0581885fe39d38b
    saveName: 28e9e2f90bff1ecaf0581885fe39d38b.zip
    id: WU_FILE_1
    name: 150M的东西.zip
    type: application/x-zip-compressed
    lastModifiedDate: Thu Feb 14 2019 14:07:49 GMT 0800 (中国标准时间)
    size: 147888830
    chunks: 29
    chunk: 20
    file: (binary)
 }
 
 reqonse
 
 文件未分割，上传成功
 
 文件分割，21/29上传成功
 
 
 3.文件合并
 http://localhost:8086/uploadFile-mergeblock
  没有达到分片最小size  不会发送请求

request
{
  md5: 28e9e2f90bff1ecaf0581885fe39d38b
  saveName: 28e9e2f90bff1ecaf0581885fe39d38b.zip
}

response
提示合并成功
 
 */
;(function() {
  //WebUploader注册事件
   (()=>{
     let alreadyArr = [],
      md5="";
      WebUploader.Uploader.register({
          "before-send-file":"beforeSendFile",
          "before-send":"beforeSend",
          "after-send-file":"afterSendFile",
      },{
        beforeSendFile:function(file){
          if(!this.owner.options.chunked) return false
         let $this = this;
         var deferred = WebUploader.Deferred();
         let uploader = new WebUploader.Uploader();
         let url = $this.owner.options.server;
          //1、计算文件的唯一标记fileMd5，用于断点续传  如果.md5File(file)方法里只写一个file参数则计算MD5值会很慢 所以加了后面的参数：10*1024*1024  
          uploader.md5File(file,0,10*1024*1024).then(function(md5val){    
              $this.owner.options.formData.md5 = md5val;
              $this.owner.options.formData.saveName=`${md5val}.${file.ext}`;
              md5 = md5val;
              //md5验证文件是否传玩
              $.ajax({
                type:"post",
                url:url+"-checkblock",
                data:$this.owner.options.formData,
                success(data){
                  alreadyArr = data;
                  deferred.resolve();
                },
                error(e){
                  if(e.status=="404"){
                    console.error(`${url+"-checkblock"}请求未找到~\n当options.chunked为true时需要实现以下三个接口\n1.${url+"-checkblock"}--检查分块\n2.${url}--上传分块\n3.${url+"-mergeblock"}--合并分块`)
                  }
                }
              })
          });    
          return deferred.promise();    
        },
        beforeSend:function(block){
        if(!this.owner.options.chunked) return false
          var deferred = WebUploader.Deferred();
            if(alreadyArr=="all"){
               deferred.reject();
            }
            if(alreadyArr.indexOf(block.chunk+"")!=-1){
              deferred.reject();
            }else{
              deferred.resolve();
            }
          return deferred.promise();
        },
        afterSendFile(file){
          if(!this.owner.options.chunked) return false
          var deferred = WebUploader.Deferred();
          let url = this.owner.options.server;
          if(alreadyArr!="all"&&file.size>this.owner.options.chunkSize){
            //合并文件
            $.ajax({
              type:"post",
              url:url+"-mergeblock",
              data:this.owner.options.formData,
              success(data){
                deferred.resolve();
              },
              error(e){
                if(e.status=="404"){
                  console.error(`${url+"-mergeblock"}请求未找到~\n当options.chunked为true时需要实现以下三个接口\n1.${url+"-checkblock"}--检查分块\n2.${url}--上传分块\n3.${url+"-mergeblock"}--合并分块`)
                }
              }
            })
          }else{
            deferred.resolve();
          }
          return deferred.promise();
        }
      })
   })()
  
  
  class Xupload {
    constructor(opts) {
      this._default = {
        // swf文件路径
        dnd: document.body,
        disableGlobalDnd: true,
        paste: document.body,
        // 文件接收服务端。
        server: '/upload',
        // 选择文件的按钮。可选。
        // 内部根据当前运行是创建，可能是input元素，也可能是flash.
        pick: {
          id: "",
          label: "选择文件",
        },
        runtimeOrder: "html5",
        prepareNextFile: true,
        // 不压缩image, 默认如果是jpeg，文件上传前会压缩一把再上传！
        resize: false,
        chunked: true,
        //每个文件成功后返回的模板
        uploadSuccessHtml:function(file){
          return `
             <li class="list-group-item animated fadeIn">
              <div class="file-info">
                <i class="file-icon ${xuploadbox.getIconByfile(file.type,file.name)}"></i>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${WebUploader.formatSize(file.size)})</span>
              </div>
              <div class="file-opts">
                <a href="javascript:;" class="js_upload_remove" data-id="${file.id}"><i class="glyphicon glyphicon-remove"></i></a>
              </div>
            </li>
          `
        },
        //需要   name type size id  四个key
        backshowList:[]
      }
      this.opts = $.extend(true, {}, this._default,opts);
      
      this.ins = WebUploader.create(this.opts);
      xuploadbox.init(this.ins);
      //暴露出去
      this.ins.xuploadbox = xuploadbox;
      this.$inputBox = $(this.ins.options.pick.id);
      
      this.$inputShow=null;
      this.selfInit();
      return this.ins;
    }
    
    selfInit() {
      //重构html
      this.rehtml();
      this.$inputShow = this.$inputBox.find(".js_fileChoose input");
      //事件初始化
      
      //重置整个list
      let cb = ()=>xuploadbox.relist();
      //只重置li
      let cbli = id=>xuploadbox.reli(id);
      
      this.filesQueued(cb);
      
      this.fileDequeued(cbli);
      this.reset(cb);
      
      this.startUpload(cb);
      this.stopUpload(cb);
      
      this.uploadFinished(cb);
      
      this.uploadStart(cbli);
      this.uploadProgress(cbli);
      this.uploadError(cbli);
      this.uploadSuccess(cb);
    }
    rehtml() {
        let text = this.ins.options.pick.label;
      /*
       input
      <div class="input-group"">
        <span class="input-group-btn">
          <button class="btn btn-default" type="button">' + text + '</button>
        </span>
        <input class="form-control" type="text">
      </div>
      
      ul..
       <ul class="list-group xupload-show js_xupload-show">
          <li class="list-group-item">
            <div class="file-info">
              <i class="file-icon fa fa-file-word-o text-primary"></i>
              <span class="file-name">文件名称</span>
              <span class="file-size">(32KB)</span>
            </div>
            <div class="file-opts">
              <i class="glyphicon glyphicon-remove"></i>
            </div>
          </li>
        </ul>
        */
       //input
      this.$inputBox.removeClass("btn").find(".webuploader-pick")
        .removeClass("webuploader-pick")
        .addClass("js_fileChoose input-group")
        .css("background","transparent")
        .html(`
        <span class="input-group-btn">
          <button class="btn btn-default" type="button">${text}</button>
        </span>
        <input class="form-control" type="text" style="z-index:0" placeholder="请选择文件...">`)
        ;
        //ul
        let lidoms="";
        if(this.opts.backshowList.length>0){
          for(let file of this.opts.backshowList){
            lidoms +=this.opts.uploadSuccessHtml(file);
          }
        }
      this.$inputBox.after(`
       <ul class="list-group xupload-show js_xupload-show">
        ${lidoms}
        </ul>  
      `);
    }
    getFiles(){
      return this.ins.getFiles().filter(v=>{
        return v.getStatus();
      });
    }
    //fileQueued  文件选择完成
    filesQueued(cb) {
      this.ins.on('filesQueued',files=>{
       //input展示
       this._inputShow();
        //box展示
        let $this =this;;
        xuploadbox.push(files);
        xuploadbox.autoShow();
        cb&&cb()
      });
    }
     fileDequeued(cb){
       this.ins.on('fileDequeued',file=>{
        cb&&cb(file.id);
      });
    }
      reset(cb){
       this.ins.on('reset',()=>{
        cb&&cb();
      });
    }
      startUpload(cb){
       this.ins.on('startUpload',()=>{
        cb&&cb();
      });
    }
      stopUpload(cb){
       this.ins.on('stopUpload',()=>{
        cb&&cb();
      });
    }
      uploadFinished(cb){
       this.ins.on('uploadFinished',()=>{
        cb&&cb();
      });
    }
      uploadStart(cb){
       this.ins.on('uploadStart',file=>{
         file.mark = true;
         xuploadbox.autoShow();
        cb&&cb(file.id);
      });
    }
      uploadProgress(cb){
       this.ins.on('uploadProgress',(file,precent,...a)=>{
         file.oprecent =precent;
         file.precent = (precent*100).toFixed(2)+"%";
         //这里有点怪的是有两次进度一样的数据进来  导致算速度有误  跳过这次渲染
         if(file.oprecent != file.pprecent){
           speed(file);
           xuploadbox.progress(file);
         }
         if(file.mark){
           file.mark=false;
           cb&&cb(file.id);
         }
      });
      
      const S1 = 1000;//1秒 = 1000ms
      function speed(file){
        if(file.preTime){
          let stepTime = (new Date()).getTime() - file.preTime;
          let stepSize = (file.oprecent - file.pprecent)*file.size;
          file.speed = "("+WebUploader.formatSize(S1*stepSize/stepTime)+"/s)";
        }
        file.preTime = (new Date()).getTime();
        file.pprecent = file.oprecent;
      }
      
    }
      uploadError(cb){
       this.ins.on('uploadError',(file,reason)=>{
         console.error(reason)
        cb&&cb(file.id);
      });
    }
      uploadSuccess(cb){
       this.ins.on('uploadSuccess',file=>{
         xuploadbox.removeFile(file.id);
         //新增
        this.$inputBox.siblings(".js_xupload-show").append(
          this.opts.uploadSuccessHtml(file)
        );
        cb&&cb(file.id);
      });
    }
      
    _inputShow(){
        let files = this.getFiles();
        if(files.length==1){
          this.$inputShow.val(files[0].name);
        }else if(files.length>1){
          this.$inputShow.val(`已选择了${files.length}个文件`);
        }else{
          this.$inputShow.val("");
        }
    }
    
  }
  if($(".js_xupload").length > 0) {
    $(".js_xupload").each(function() {
      let opts = $(this).data();
      opts.pick = {};
      opts.pick.id = this;
      this.xupload = new Xupload(opts)
    });
  }
  window.Xupload = Xupload;
  
})();