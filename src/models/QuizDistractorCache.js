import mongoose from 'mongoose';
const candidateSchema=new mongoose.Schema({
  vocabId:{type:mongoose.Schema.Types.ObjectId,ref:'Vocabulary',default:null},
  answer:{type:String,required:true},
  source:{type:String,enum:['database','generated'],required:true},
  score:{type:Number,default:0},
},{_id:false});
const schema=new mongoose.Schema({
  vocabId:{type:mongoose.Schema.Types.ObjectId,ref:'Vocabulary',required:true},
  direction:{type:String,enum:['jp_vi','vi_jp','kanji','jp_kanji','image'],required:true},
  signature:{type:String,required:true},
  version:{type:Number,default:3},
  candidates:{type:[candidateSchema],default:[]},
},{timestamps:true});
schema.index({vocabId:1,direction:1},{unique:true});
export default mongoose.models.QuizDistractorCache||mongoose.model('QuizDistractorCache',schema);
